import { getPgPool } from '../../../infrastructure/database/connection';
import {
  AUTHORITY_ROLES,
  DEFAULT_AUDIO_CHUNK_DURATION_MS,
  UUID_REGEX,
} from '../../../shared/constants/system';
import {
  encryptBuffer,
  decryptBuffer,
  sha256Hex,
  signEvidenceStreamUrl,
} from '../../../shared/utils/cryptoVault';

export interface SaveAudioEvidenceInput {
  alertId: string;
  userId: string | null;
  audioBase64: string;
  mimeType?: string;
  chunkIndex?: number;
  durationMs?: number;
  apiBaseUrl: string;
}

export interface SavedAudioEvidenceResult {
  id: string;
  alertId: string;
  sha256Hash: string;
  byteSize: number;
  chunkIndex: number;
  mimeType: string;
  signedStreamUrl: string;
  createdAt: string;
}

function stripDataUriPrefix(raw: string): { base64: string; detectedMime?: string } {
  const match = raw.match(/^data:([^;]+);base64,(.+)$/s);
  if (match) {
    return { detectedMime: match[1], base64: match[2] };
  }
  return { base64: raw };
}

export class EvidenceStorageService {
  /**
   * Almacena un fragmento de audio encubierto con hash forense SHA-256,
   * cifrado en reposo AES-256-GCM y URL temporal firmada para reproducción en Centro de Mando.
   */
  static async saveAudioChunk(
    input: SaveAudioEvidenceInput
  ): Promise<SavedAudioEvidenceResult> {
    if (!UUID_REGEX.test(input.alertId)) {
      throw new Error('Identificador de alerta (UUID) no válido');
    }

    const { base64, detectedMime } = stripDataUriPrefix(input.audioBase64);
    const buffer = Buffer.from(base64, 'base64');

    if (buffer.length < 32) {
      throw new Error('El fragmento de audio está vacío o corrupto');
    }
    if (buffer.length > 8 * 1024 * 1024) {
      throw new Error('El fragmento de audio excede el tamaño máximo permitido (8 MB)');
    }

    const mimeType = input.mimeType || detectedMime || 'audio/webm';
    const sha256Hash = sha256Hex(buffer);
    const encryptedPayload = encryptBuffer(buffer);
    const chunkIndex = Number.isFinite(input.chunkIndex) ? Number(input.chunkIndex) : 0;

    const pool = getPgPool();
    const insertRes = await pool.query(
      `INSERT INTO public.alert_evidence
         (alert_id, user_id, media_type, chunk_index, duration_ms, byte_size, sha256_hash, storage_provider, encrypted_payload)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'encrypted_vault', $8)
       RETURNING id, created_at`,
      [
        input.alertId,
        input.userId,
        mimeType,
        chunkIndex,
        input.durationMs ?? null,
        buffer.length,
        sha256Hash,
        encryptedPayload,
      ]
    );

    const row = insertRes.rows[0];
    const evidenceId: string = row.id;
    const signedStreamUrl = signEvidenceStreamUrl(evidenceId, input.apiBaseUrl, 3600);

    // Registrar en cadena de eventos de la alerta (event sourcing)
    try {
      await pool.query(
        `INSERT INTO public.alert_events (alert_id, actor_id, event_type, notes)
         VALUES ($1, $2, 'audio_evidence', $3)`,
        [
          input.alertId,
          input.userId,
          `Evidencia acústica #${chunkIndex} cifrada (SHA-256: ${sha256Hash.slice(0, 16)}...)`,
        ]
      );
    } catch {
      // No bloquear si alert_events tiene restricción de actor_id anónimo
    }

    return {
      id: evidenceId,
      alertId: input.alertId,
      sha256Hash,
      byteSize: buffer.length,
      chunkIndex,
      mimeType,
      signedStreamUrl,
      createdAt:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : String(row.created_at),
    };
  }

  /**
   * Descifra y entrega un fragmento de audio validado para reproducción autorizada.
   */
  static async getDecryptedAudioById(
    evidenceId: string
  ): Promise<{ buffer: Buffer; mimeType: string; sha256Hash: string } | null> {
    if (!UUID_REGEX.test(evidenceId)) {
      return null;
    }
    const pool = getPgPool();
    const res = await pool.query(
      `SELECT media_type, sha256_hash, encrypted_payload
       FROM public.alert_evidence
       WHERE id = $1
       LIMIT 1`,
      [evidenceId]
    );

    if (res.rowCount === 0 || !res.rows[0].encrypted_payload) {
      return null;
    }

    const row = res.rows[0];
    const buffer = decryptBuffer(row.encrypted_payload);
    return {
      buffer,
      mimeType: row.media_type || 'audio/webm',
      sha256Hash: row.sha256_hash,
    };
  }

  /**
   * Lista la evidencia asociada a una alerta con URLs firmadas frescas.
   */
  static async listAlertEvidence(alertId: string, apiBaseUrl: string) {
    const pool = getPgPool();
    const res = await pool.query(
      `SELECT id, media_type, chunk_index, duration_ms, byte_size, sha256_hash, created_at
       FROM public.alert_evidence
       WHERE alert_id = $1
       ORDER BY chunk_index ASC, created_at ASC`,
      [alertId]
    );

    return res.rows.map((r) => ({
      id: r.id,
      alertId,
      mimeType: r.media_type,
      chunkIndex: r.chunk_index,
      durationMs: r.duration_ms,
      byteSize: r.byte_size,
      sha256Hash: r.sha256_hash,
      url: signEvidenceStreamUrl(r.id, apiBaseUrl, 3600),
      createdAt: r.created_at,
    }));
  }

  /**
   * Lista el historial de alertas con sus grabaciones acústicas descifrables mediante URL firmada.
   * - Ciudadanos: ven estrictamente sus propias alertas y audios.
   * - Operadores / Policía / Supervisores / Admin: ven las alertas recientes con evidencia acústica.
   */
  static async listEvidenceVault(params: {
    userId: string;
    role: string;
    apiBaseUrl: string;
    limit?: number;
  }) {
    const pool = getPgPool();
    const isAuthority = AUTHORITY_ROLES.includes(params.role);
    const maxAlerts = params.limit || 20;

    const alertsQuery = isAuthority
      ? `SELECT a.id, a.type, a.status, a.address, a.description, a.created_at,
                u.full_name AS citizen_name,
                COUNT(e.id)::int AS clip_count
         FROM public.alerts a
         LEFT JOIN public.users u ON u.id = a.user_id
         LEFT JOIN public.alert_evidence e ON e.alert_id = a.id
         GROUP BY a.id, u.full_name
         HAVING COUNT(e.id) > 0 OR a.created_at > NOW() - INTERVAL '24 hours'
         ORDER BY (COUNT(e.id) > 0) DESC, a.created_at DESC
         LIMIT $1`
      : `SELECT a.id, a.type, a.status, a.address, a.description, a.created_at,
                u.full_name AS citizen_name,
                COUNT(e.id)::int AS clip_count
         FROM public.alerts a
         LEFT JOIN public.users u ON u.id = a.user_id
         LEFT JOIN public.alert_evidence e ON e.alert_id = a.id
         WHERE a.user_id = $1
         GROUP BY a.id, u.full_name
         ORDER BY a.created_at DESC
         LIMIT $2`;

    const alertsRes = isAuthority
      ? await pool.query(alertsQuery, [maxAlerts])
      : await pool.query(alertsQuery, [params.userId, maxAlerts]);

    if (alertsRes.rowCount === 0) {
      return [];
    }

    const alertIds = alertsRes.rows.map((r) => r.id);
    const clipsRes = await pool.query(
      `SELECT id, alert_id, media_type, chunk_index, duration_ms, byte_size, sha256_hash, created_at
       FROM public.alert_evidence
       WHERE alert_id = ANY($1::uuid[])
       ORDER BY alert_id, chunk_index ASC, created_at ASC`,
      [alertIds]
    );

    const clipsByAlert = new Map<string, any[]>();
    for (const c of clipsRes.rows) {
      const list = clipsByAlert.get(c.alert_id) || [];
      list.push({
        id: c.id,
        alertId: c.alert_id,
        mimeType: c.media_type,
        chunkIndex: c.chunk_index,
        durationMs: c.duration_ms || DEFAULT_AUDIO_CHUNK_DURATION_MS,
        byteSize: c.byte_size,
        sha256Hash: c.sha256_hash,
        url: signEvidenceStreamUrl(c.id, params.apiBaseUrl, 3600),
        createdAt: c.created_at,
      });
      clipsByAlert.set(c.alert_id, list);
    }

    return alertsRes.rows.map((a) => ({
      alertId: a.id,
      type: a.type,
      status: a.status,
      address: a.address || 'Ubicación registrada',
      description: a.description || '',
      citizenName: a.citizen_name || 'Ciudadano',
      createdAt: a.created_at,
      clipCount: a.clip_count,
      clips: clipsByAlert.get(a.id) || [],
    }));
  }
}

import crypto from 'crypto';
import sharp from 'sharp';
import { getPgPool } from '../../../infrastructure/database/connection';
import {
  encryptBuffer,
  decryptBuffer,
  sha256Hex,
} from '../../../shared/utils/cryptoVault';
import { logger } from '../../../shared/utils/logger';

export interface KycInputBundle {
  idCardFront?: string;
  idCardBack?: string;
  selfiePhoto?: string;
}

export interface KycEvaluationResult {
  isVerified: boolean;
  facialVerificationStatus: 'pending' | 'under_review' | 'verified' | 'rejected';
  similarityScore: number | null;
  provider: 'aws_rekognition' | 'forensic_queue' | 'none';
  encryptedVault: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
}

const MIN_SIMILARITY_THRESHOLD = 85;

function decodeBase64Image(raw: string): Buffer {
  const match = raw.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/s);
  const b64 = match ? match[1] : raw;
  return Buffer.from(b64, 'base64');
}

function hmacSha256(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest();
}

async function inspectAndNormalizeImage(buf: Buffer, label: string) {
  let meta: sharp.Metadata;
  let stats: sharp.Stats;
  try {
    const img = sharp(buf).rotate();
    meta = await img.metadata();
    stats = await img.stats();
  } catch {
    const err: any = new Error(`El archivo de ${label} no es una imagen válida.`);
    err.statusCode = 422;
    throw err;
  }

  if ((meta.width || 0) < 180 || (meta.height || 0) < 180) {
    const err: any = new Error(
      `La captura de ${label} tiene resolución insuficiente (${meta.width}x${meta.height}). Toma una fotografía más nítida.`
    );
    err.statusCode = 422;
    throw err;
  }

  const avgStdev =
    stats.channels.slice(0, 3).reduce((acc, c) => acc + c.stdev, 0) /
    Math.max(1, Math.min(3, stats.channels.length));

  if (avgStdev < 8) {
    const err: any = new Error(
      `La captura de ${label} carece de detalle visual (imagen en negro, velada o borrosa).`
    );
    err.statusCode = 422;
    throw err;
  }

  // Normalizar orientación EXIF (crítico en iOS/Android) y preservar nitidez facial (1600px @ JPEG 88)
  const normalized = await sharp(buf)
    .rotate()
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 88 })
    .toBuffer();

  return {
    normalized,
    width: meta.width || 0,
    height: meta.height || 0,
    stdev: Math.round(avgStdev * 10) / 10,
    entropy: Math.round((stats.entropy || 0) * 100) / 100,
  };
}

/**
 * Invocación directa AWS Signature V4 a Amazon Rekognition CompareFaces
 * (cero dependencias adicionales de SDK pesado).
 */
async function compareFacesAwsRekognition(
  sourceSelfie: Buffer,
  targetIdFront: Buffer
): Promise<{ matched: boolean; similarity: number; unmatchedFacesCount: number }> {
  const accessKey = (process.env.AWS_ACCESS_KEY_ID || '').trim().replace(/^["']|["']$/g, '');
  const secretKey = (process.env.AWS_SECRET_ACCESS_KEY || '').trim().replace(/^["']|["']$/g, '');
  const region = (process.env.AWS_REGION || 'us-east-1').trim();

  if (!accessKey || !secretKey) {
    const cfgErr: any = new Error(
      'El servicio de reconocimiento facial biométrico no está configurado en el servidor.'
    );
    cfgErr.statusCode = 503;
    throw cfgErr;
  }

  const service = 'rekognition';
  const host = `rekognition.${region}.amazonaws.com`;
  const endpoint = `https://${host}/`;

  // SimilarityThreshold: 1 permite recibir el porcentaje exacto incluso cuando la coincidencia es baja (<70%)
  const body = JSON.stringify({
    SourceImage: { Bytes: sourceSelfie.toString('base64') },
    TargetImage: { Bytes: targetIdFront.toString('base64') },
    SimilarityThreshold: 1,
  });

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  const contentType = 'application/x-amz-json-1.1';
  const amzTarget = 'RekognitionService.CompareFaces';
  const payloadHash = crypto.createHash('sha256').update(body, 'utf8').digest('hex');

  const canonicalHeaders =
    `content-type:${contentType}\n` +
    `host:${host}\n` +
    `x-amz-date:${amzDate}\n` +
    `x-amz-target:${amzTarget}\n`;
  const signedHeaders = 'content-type;host;x-amz-date;x-amz-target';

  const canonicalRequest = [
    'POST',
    '/',
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    crypto.createHash('sha256').update(canonicalRequest, 'utf8').digest('hex'),
  ].join('\n');

  const kDate = hmacSha256(`AWS4${secretKey}`, dateStamp);
  const kRegion = hmacSha256(kDate, region);
  const kService = hmacSha256(kRegion, service);
  const kSigning = hmacSha256(kService, 'aws4_request');
  const signature = crypto
    .createHmac('sha256', kSigning)
    .update(stringToSign, 'utf8')
    .digest('hex');

  const authHeader =
    `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': contentType,
      'X-Amz-Date': amzDate,
      'X-Amz-Target': amzTarget,
      Authorization: authHeader,
    },
    body,
  });

  if (!resp.ok) {
    let parsedErr: any = null;
    const errText = await resp.text();
    try {
      parsedErr = JSON.parse(errText);
    } catch {
      parsedErr = null;
    }

    const errCode = parsedErr?.Code || parsedErr?.__type || '';
    if (errCode.includes('InvalidParameterException')) {
      const noFaceErr: any = new Error(
        'No se detectó un rostro humano claro en tu selfie o en el frente de tu cédula. Asegúrate de fotografiar el frente de tu documento (donde aparece tu foto) y encuadrar bien tu rostro con buena luz.'
      );
      noFaceErr.statusCode = 422;
      noFaceErr.code = 'NO_FACE_DETECTED';
      throw noFaceErr;
    }

    logger.error(`AWS Rekognition error HTTP ${resp.status}: ${errText.slice(0, 220)}`);
    const svcErr: any = new Error(
      'No fue posible completar la validación biométrica facial en este momento. Intenta de nuevo en unos segundos.'
    );
    svcErr.statusCode = 503;
    throw svcErr;
  }

  const json: any = await resp.json();
  const matches = Array.isArray(json?.FaceMatches) ? json.FaceMatches : [];
  const unmatched = Array.isArray(json?.UnmatchedFaces) ? json.UnmatchedFaces : [];

  // Ordenar por mayor similitud en caso de múltiples rostros en fondo
  matches.sort((a: any, b: any) => Number(b?.Similarity || 0) - Number(a?.Similarity || 0));
  const topMatch = matches[0] || null;
  const similarity = topMatch?.Similarity ? Math.round(Number(topMatch.Similarity) * 100) / 100 : 0;

  return {
    matched: similarity >= MIN_SIMILARITY_THRESHOLD,
    similarity,
    unmatchedFacesCount: unmatched.length,
  };
}

export class KycVerificationService {
  /**
   * Pre-validación biométrica en tiempo real durante el Paso 3 del registro:
   * compara el rostro en vivo (selfie) contra el retrato del frente de la cédula antes de dejar avanzar.
   */
  static async verifyFaceMatchPreview(input: {
    idCardFront?: string;
    selfiePhoto?: string;
  }): Promise<{ verified: boolean; similarityScore: number }> {
    if (!input.idCardFront || !input.selfiePhoto) {
      const err: any = new Error(
        'Se requiere la foto frontal de tu cédula y tu captura facial en vivo para verificar tu identidad.'
      );
      err.statusCode = 422;
      throw err;
    }

    const rawFront = decodeBase64Image(input.idCardFront);
    const rawSelfie = decodeBase64Image(input.selfiePhoto);

    if (sha256Hex(rawFront) === sha256Hex(rawSelfie)) {
      const err: any = new Error(
        'La fotografía del documento y la captura de rostro no pueden ser la misma imagen.'
      );
      err.statusCode = 422;
      throw err;
    }

    const [frontInfo, selfieInfo] = await Promise.all([
      inspectAndNormalizeImage(rawFront, 'frente de cédula'),
      inspectAndNormalizeImage(rawSelfie, 'rostro en vivo'),
    ]);

    const bio = await compareFacesAwsRekognition(selfieInfo.normalized, frontInfo.normalized);

    if (!bio.matched) {
      logger.warn(
        `🚫 Intento de registro bloqueado por no coincidencia facial (similitud: ${bio.similarity}%)`
      );
      const mismatchErr: any = new Error(
        `Verificación facial rechazada: El rostro capturado no coincide con la fotografía de la cédula (${bio.similarity.toFixed(
          1
        )}% de coincidencia; mínimo requerido ${MIN_SIMILARITY_THRESHOLD}%).`
      );
      mismatchErr.statusCode = 422;
      mismatchErr.code = 'BIOMETRIC_MISMATCH';
      mismatchErr.similarityScore = bio.similarity;
      throw mismatchErr;
    }

    logger.info(`✅ Biometría facial aprobada en Paso 3 (similitud: ${bio.similarity}%)`);
    return {
      verified: true,
      similarityScore: bio.similarity,
    };
  }

  /**
   * Valida autenticidad estructural de imágenes KYC (resolución, entropía, anti-duplicado),
   * exige coincidencia biométrica facial >= 85% con AWS Rekognition (bloqueando suplantaciones),
   * y cifra los documentos con AES-256-GCM conforme a la Ley 1581.
   */
  static async evaluateAndEncryptKyc(
    bundle: KycInputBundle
  ): Promise<KycEvaluationResult> {
    if (!bundle.idCardFront || !bundle.idCardBack || !bundle.selfiePhoto) {
      const err: any = new Error(
        'La verificación documental (frente y respaldo de cédula) y biométrica facial es obligatoria para crear una cuenta.'
      );
      err.statusCode = 422;
      throw err;
    }

    const rawFront = decodeBase64Image(bundle.idCardFront);
    const rawBack = decodeBase64Image(bundle.idCardBack);
    const rawSelfie = decodeBase64Image(bundle.selfiePhoto);

    // 1. Anti-replay: bloquear envío de la misma foto repetida en distintos campos
    const hashFront = sha256Hex(rawFront);
    const hashBack = sha256Hex(rawBack);
    const hashSelfie = sha256Hex(rawSelfie);

    if (
      hashFront === hashBack ||
      hashFront === hashSelfie ||
      hashBack === hashSelfie
    ) {
      const err: any = new Error(
        'Las fotografías de anverso, reverso y rostro deben ser capturas distintas.'
      );
      err.statusCode = 422;
      throw err;
    }

    // 2. Inspección óptica real con Sharp + auto-rotación EXIF
    const [frontInfo, backInfo, selfieInfo] = await Promise.all([
      inspectAndNormalizeImage(rawFront, 'anverso de cédula'),
      inspectAndNormalizeImage(rawBack, 'reverso de cédula'),
      inspectAndNormalizeImage(rawSelfie, 'rostro biométrico'),
    ]);

    // 3. Comparación biométrica obligatoria (AWS Rekognition CompareFaces >= 85%)
    const bio = await compareFacesAwsRekognition(
      selfieInfo.normalized,
      frontInfo.normalized
    );

    if (!bio.matched) {
      logger.warn(
        `🚫 Registro bloqueado en servidor: suplantación o rostro distinto (${bio.similarity}% < ${MIN_SIMILARITY_THRESHOLD}%)`
      );
      const rejectErr: any = new Error(
        `Identidad biométrica rechazada: El rostro de la selfie no coincide con el documento de identidad (${bio.similarity.toFixed(
          1
        )}% de similitud). Por seguridad no se creó la cuenta.`
      );
      rejectErr.statusCode = 422;
      rejectErr.code = 'BIOMETRIC_MISMATCH';
      rejectErr.similarityScore = bio.similarity;
      throw rejectErr;
    }

    // 4. Cifrar con AES-256-GCM para no guardar documentos planos en la tabla users
    const encryptedVault = {
      algorithm: 'aes-256-gcm',
      version: 1,
      encryptedAt: new Date().toISOString(),
      hashes: {
        front: hashFront,
        back: hashBack,
        selfie: hashSelfie,
      },
      front: encryptBuffer(frontInfo.normalized),
      back: encryptBuffer(backInfo.normalized),
      selfie: encryptBuffer(selfieInfo.normalized),
    };

    return {
      isVerified: true,
      facialVerificationStatus: 'verified',
      similarityScore: bio.similarity,
      provider: 'aws_rekognition',
      encryptedVault,
      metadata: {
        front: { w: frontInfo.width, h: frontInfo.height, entropy: frontInfo.entropy },
        back: { w: backInfo.width, h: backInfo.height, entropy: backInfo.entropy },
        selfie: { w: selfieInfo.width, h: selfieInfo.height, entropy: selfieInfo.entropy },
      },
    };
  }

  /**
   * Persiste la bóveda cifrada y el consentimiento Ley 1581 para el usuario recién creado,
   * limpiando cualquier copia base64 en texto plano.
   */
  static async persistEncryptedKycForUser(
    userId: string,
    evaluation: KycEvaluationResult,
    ipAddress?: string
  ): Promise<void> {
    const pool = getPgPool();
    await pool.query(
      `UPDATE public.users
       SET id_card_front = NULL,
           id_card_back = NULL,
           selfie_photo = NULL,
           is_verified = $2,
           facial_verification_status = $3,
           kyc_similarity_score = $4,
           kyc_provider = $5,
           kyc_metadata = $6::jsonb,
           kyc_encrypted_vault = $7::jsonb,
           privacy_consent_at = NOW(),
           privacy_policy_version = 'L1581-2026.1'
       WHERE id = $1`,
      [
        userId,
        evaluation.isVerified,
        evaluation.facialVerificationStatus,
        evaluation.similarityScore,
        evaluation.provider,
        JSON.stringify(evaluation.metadata),
        evaluation.encryptedVault ? JSON.stringify(evaluation.encryptedVault) : null,
      ]
    );

    await pool.query(
      `INSERT INTO public.privacy_audit_logs
         (actor_id, target_user_id, resource_type, action, ip_address, metadata)
       VALUES ($1, $1, 'kyc_biometric_vault', 'CONSENT_AND_ENCRYPT', $2, $3::jsonb)`,
      [
        userId,
        ipAddress || null,
        JSON.stringify({
          policy: 'L1581-2026.1',
          provider: evaluation.provider,
          status: evaluation.facialVerificationStatus,
          similarityScore: evaluation.similarityScore,
        }),
      ]
    );
  }

  /**
   * Descifra el expediente KYC únicamente para supervisores/administradores autenticados
   * y deja rastro obligatorio en privacy_audit_logs (Ley 1581).
   */
  static async getDecryptedKycDossier(
    targetUserId: string,
    actorId: string,
    ipAddress?: string
  ) {
    const pool = getPgPool();
    const res = await pool.query(
      `SELECT id, full_name, cedula, email, is_verified, facial_verification_status,
              kyc_similarity_score, kyc_provider, kyc_metadata, kyc_encrypted_vault, privacy_consent_at
       FROM public.users
       WHERE id = $1
       LIMIT 1`,
      [targetUserId]
    );

    if (res.rowCount === 0) return null;
    const u = res.rows[0];
    const vault = u.kyc_encrypted_vault;

    let images: {
      idCardFront: string | null;
      idCardBack: string | null;
      selfiePhoto: string | null;
    } = {
      idCardFront: null,
      idCardBack: null,
      selfiePhoto: null,
    };

    if (vault && vault.front && vault.back && vault.selfie) {
      images = {
        idCardFront: `data:image/jpeg;base64,${decryptBuffer(vault.front).toString('base64')}`,
        idCardBack: `data:image/jpeg;base64,${decryptBuffer(vault.back).toString('base64')}`,
        selfiePhoto: `data:image/jpeg;base64,${decryptBuffer(vault.selfie).toString('base64')}`,
      };
    }

    await pool.query(
      `INSERT INTO public.privacy_audit_logs
         (actor_id, target_user_id, resource_type, action, ip_address, metadata)
       VALUES ($1, $2, 'kyc_biometric_vault', 'DECRYPT_FOR_REVIEW', $3, '{"reason":"admin_kyc_review"}'::jsonb)`,
      [actorId, targetUserId, ipAddress || null]
    );

    return {
      userId: u.id,
      fullName: u.full_name,
      cedula: u.cedula,
      email: u.email,
      isVerified: u.is_verified,
      facialVerificationStatus: u.facial_verification_status,
      similarityScore: u.kyc_similarity_score ? Number(u.kyc_similarity_score) : null,
      provider: u.kyc_provider,
      privacyConsentAt: u.privacy_consent_at,
      metadata: u.kyc_metadata,
      images,
    };
  }
}

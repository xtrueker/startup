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

function decodeBase64Image(raw: string): Buffer {
  const match = raw.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/s);
  const b64 = match ? match[1] : raw;
  return Buffer.from(b64, 'base64');
}

function hmacSha256(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest();
}

/**
 * Invocación directa AWS Signature V4 a Amazon Rekognition CompareFaces
 * (cero dependencias adicionales de SDK pesado).
 */
async function compareFacesAwsRekognition(
  sourceSelfie: Buffer,
  targetIdFront: Buffer
): Promise<{ matched: boolean; similarity: number }> {
  const accessKey = (process.env.AWS_ACCESS_KEY_ID || '').trim().replace(/^["']|["']$/g, '');
  const secretKey = (process.env.AWS_SECRET_ACCESS_KEY || '').trim().replace(/^["']|["']$/g, '');
  const region = (process.env.AWS_REGION || 'us-east-1').trim();
  const service = 'rekognition';
  const host = `rekognition.${region}.amazonaws.com`;
  const endpoint = `https://${host}/`;

  const body = JSON.stringify({
    SourceImage: { Bytes: sourceSelfie.toString('base64') },
    TargetImage: { Bytes: targetIdFront.toString('base64') },
    SimilarityThreshold: 70,
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
        'No se detectó un rostro humano claro en tu selfie o en el frente de tu cédula. Asegúrate de encuadrar bien ambos rostros con buena iluminación.'
      );
      noFaceErr.statusCode = 422;
      throw noFaceErr;
    }

    throw new Error(`AWS Rekognition HTTP ${resp.status}: ${errText.slice(0, 180)}`);
  }

  const json: any = await resp.json();
  const topMatch = Array.isArray(json?.FaceMatches) ? json.FaceMatches[0] : null;
  const similarity = topMatch?.Similarity ? Number(topMatch.Similarity) : 0;
  return {
    matched: similarity >= 85,
    similarity: Math.round(similarity * 100) / 100,
  };
}

export class KycVerificationService {
  /**
   * Valida autenticidad estructural de imágenes KYC (resolución, entropía, anti-duplicado),
   * ejecuta biometría facial (AWS Rekognition si hay credenciales o cola forense honesta),
   * y cifra los documentos con AES-256-GCM conforme a la Ley 1581.
   */
  static async evaluateAndEncryptKyc(
    bundle: KycInputBundle
  ): Promise<KycEvaluationResult> {
    if (!bundle.idCardFront || !bundle.idCardBack || !bundle.selfiePhoto) {
      return {
        isVerified: false,
        facialVerificationStatus: 'pending',
        similarityScore: null,
        provider: 'none',
        encryptedVault: null,
        metadata: { reason: 'incomplete_documents' },
      };
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

    // 2. Inspección óptica real con Sharp (dimensiones mínimas + desviación estándar anti-lente tapado)
    const inspectAndNormalize = async (buf: Buffer, label: string) => {
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
          `La captura de ${label} tiene resolución insuficiente (${meta.width}x${meta.height}).`
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

      const normalized = await sharp(buf)
        .rotate()
        .resize({ width: 1280, height: 1280, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 82 })
        .toBuffer();

      return {
        normalized,
        width: meta.width || 0,
        height: meta.height || 0,
        stdev: Math.round(avgStdev * 10) / 10,
        entropy: Math.round((stats.entropy || 0) * 100) / 100,
      };
    };

    const [frontInfo, backInfo, selfieInfo] = await Promise.all([
      inspectAndNormalize(rawFront, 'anverso de cédula'),
      inspectAndNormalize(rawBack, 'reverso de cédula'),
      inspectAndNormalize(rawSelfie, 'rostro biométrico'),
    ]);

    // 3. Cifrar con AES-256-GCM para no guardar documentos planos en la tabla users
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

    // 4. Comparación biométrica en la nube (AWS Rekognition) si las credenciales están activas
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      try {
        const bio = await compareFacesAwsRekognition(
          selfieInfo.normalized,
          frontInfo.normalized
        );
        return {
          isVerified: bio.matched,
          facialVerificationStatus: bio.matched ? 'verified' : 'rejected',
          similarityScore: bio.similarity,
          provider: 'aws_rekognition',
          encryptedVault,
          metadata: {
            front: { w: frontInfo.width, h: frontInfo.height, entropy: frontInfo.entropy },
            selfie: { w: selfieInfo.width, h: selfieInfo.height, entropy: selfieInfo.entropy },
          },
        };
      } catch (awsErr: any) {
        if (awsErr?.statusCode === 422) {
          throw awsErr;
        }
        logger.warn(
          `AWS Rekognition no disponible (${awsErr.message}); derivando expediente a cola de revisión supervisada.`
        );
      }
    }

    // 5. Cola supervisada honesta (no marca "verified" falso sin comparación biométrica o firma humana)
    return {
      isVerified: false,
      facialVerificationStatus: 'under_review',
      similarityScore: null,
      provider: 'forensic_queue',
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

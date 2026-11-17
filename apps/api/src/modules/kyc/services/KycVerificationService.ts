import crypto from 'crypto';
import sharp from 'sharp';
import { getPgPool } from '../../../infrastructure/database/connection';
import {
  encryptBuffer,
  decryptBuffer,
  sha256Hex,
} from '../../../shared/utils/cryptoVault';
import { logger } from '../../../shared/utils/logger';
import { env } from '../../../config/env';

export type LivenessChallengeType = 'smile' | 'turn_head' | 'open_mouth';

export interface KycInputBundle {
  idCardFront?: string;
  idCardBack?: string;
  selfiePhoto?: string;
  livenessProofToken?: string;
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

async function invokeAwsRekognition(
  action: 'CompareFaces' | 'DetectText' | 'DetectFaces' | 'DetectLabels',
  payloadObj: Record<string, unknown>
): Promise<{ ok: boolean; status: number; data: any; rawText: string }> {
  const accessKey = (process.env.AWS_ACCESS_KEY_ID || '').trim().replace(/^["']|["']$/g, '');
  const secretKey = (process.env.AWS_SECRET_ACCESS_KEY || '').trim().replace(/^["']|["']$/g, '');
  const region = (process.env.AWS_REGION || 'us-east-1').trim();

  if (!accessKey || !secretKey) {
    const cfgErr: any = new Error(
      'El motor de inteligencia biométrica no está configurado en el servidor.'
    );
    cfgErr.statusCode = 503;
    throw cfgErr;
  }

  const service = 'rekognition';
  const host = `rekognition.${region}.amazonaws.com`;
  const endpoint = `https://${host}/`;
  const body = JSON.stringify(payloadObj);

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  const contentType = 'application/x-amz-json-1.1';
  const amzTarget = `RekognitionService.${action}`;
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

  const rawText = await resp.text();
  let data: any = null;
  try {
    data = JSON.parse(rawText);
  } catch {
    data = null;
  }

  return { ok: resp.ok, status: resp.status, data, rawText };
}

function toTitleCaseSpanish(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ''))
    .join(' ');
}

function isCleanPersonNameCandidate(line: string): boolean {
  const clean = line.trim();
  if (clean.length < 3 || clean.length > 44) return false;
  if (/\d/.test(clean)) return false;
  if (!/^[A-ZÁÉÍÓÚÑÜ\s.'-]+$/i.test(clean)) return false;

  const upper = clean.toUpperCase();
  const forbidden = [
    'REPUBLICA',
    'COLOMBIA',
    'IDENTIFICACION',
    'PERSONAL',
    'CEDULA',
    'CIUDADANIA',
    'EXTRANJERIA',
    'NUMERO',
    'NUIP',
    'APELLIDO',
    'NOMBRE',
    'SURNAME',
    'GIVEN',
    'NACIONALIDAD',
    'NACIMIENTO',
    'EXPEDICION',
    'LUGAR',
    'FECHA',
    'ESTATURA',
    'SEXO',
    'FIRMA',
    'REGISTRADURIA',
    'REGISTRADOR',
    'INDICE',
    'DERECHO',
  ];
  return !forbidden.some((kw) => upper.includes(kw));
}

function extractColombianIdIntelligence(lines: string[]): {
  detectedCedula: string | null;
  detectedFullName: string | null;
  documentType: string;
} {
  const cleanLines = lines.map((l) => l.trim()).filter(Boolean);
  const joinedUpper = cleanLines.join(' | ').toUpperCase();

  let documentType = 'Documento de Identidad';
  if (joinedUpper.includes('EXTRANJERIA')) {
    documentType = 'Cédula de Extranjería';
  } else if (joinedUpper.includes('NUIP') || joinedUpper.includes('SURNAMES')) {
    documentType = 'Cédula Digital de Colombia';
  } else if (joinedUpper.includes('COLOMBIA') || joinedUpper.includes('CIUDADANIA')) {
    documentType = 'Cédula de Ciudadanía';
  }

  // 1. Extraer Número de Cédula / NUIP (6 a 10 dígitos)
  let detectedCedula: string | null = null;
  for (let i = 0; i < cleanLines.length; i++) {
    const line = cleanLines[i].toUpperCase();
    if (line.includes('NUMERO') || line.includes('NÚMERO') || line.includes('NUIP')) {
      const sameLineDigits = line.replace(/[^\d]/g, '');
      if (sameLineDigits.length >= 6 && sameLineDigits.length <= 10) {
        detectedCedula = sameLineDigits;
        break;
      }
      if (i + 1 < cleanLines.length) {
        const nextDigits = cleanLines[i + 1].replace(/[^\d]/g, '');
        if (nextDigits.length >= 6 && nextDigits.length <= 10) {
          detectedCedula = nextDigits;
          break;
        }
      }
    }
  }

  if (!detectedCedula) {
    // Buscar patrón con puntos de miles colombiano: 1.098.765.432 o 79.845.123
    for (const line of cleanLines) {
      const dottedMatch = line.match(/\b(\d{1,3}(?:[.\s]\d{3}){2,3})\b/);
      if (dottedMatch) {
        const digits = dottedMatch[1].replace(/[^\d]/g, '');
        if (digits.length >= 6 && digits.length <= 10) {
          detectedCedula = digits;
          break;
        }
      }
    }
  }

  if (!detectedCedula) {
    for (const line of cleanLines) {
      if (/^\d{6,10}$/.test(line)) {
        detectedCedula = line;
        break;
      }
    }
  }

  // 2. Extraer Nombres y Apellidos (soporta Cédula Amarilla y Cédula Digital Policarbonato)
  const isDigitalLayout =
    joinedUpper.includes('SURNAME') || joinedUpper.includes('GIVEN NAME');

  let apellidos = '';
  let nombres = '';

  for (let i = 0; i < cleanLines.length; i++) {
    const upper = cleanLines[i].toUpperCase();
    if (!apellidos && upper.includes('APELLIDO')) {
      if (isDigitalLayout) {
        if (i + 1 < cleanLines.length && isCleanPersonNameCandidate(cleanLines[i + 1])) {
          apellidos = cleanLines[i + 1];
        } else if (i > 0 && isCleanPersonNameCandidate(cleanLines[i - 1])) {
          apellidos = cleanLines[i - 1];
        }
      } else {
        if (i > 0 && isCleanPersonNameCandidate(cleanLines[i - 1])) {
          apellidos = cleanLines[i - 1];
        } else if (i + 1 < cleanLines.length && isCleanPersonNameCandidate(cleanLines[i + 1])) {
          apellidos = cleanLines[i + 1];
        }
      }
    }

    if (!nombres && upper.includes('NOMBRE')) {
      if (isDigitalLayout) {
        if (i + 1 < cleanLines.length && isCleanPersonNameCandidate(cleanLines[i + 1])) {
          nombres = cleanLines[i + 1];
        } else if (i > 0 && isCleanPersonNameCandidate(cleanLines[i - 1])) {
          nombres = cleanLines[i - 1];
        }
      } else {
        if (i > 0 && isCleanPersonNameCandidate(cleanLines[i - 1])) {
          nombres = cleanLines[i - 1];
        } else if (i + 1 < cleanLines.length && isCleanPersonNameCandidate(cleanLines[i + 1])) {
          nombres = cleanLines[i + 1];
        }
      }
    }
  }

  const combined = [nombres, apellidos].filter(Boolean).join(' ').trim();
  const detectedFullName = combined.length >= 4 ? toTitleCaseSpanish(combined) : null;

  return {
    detectedCedula,
    detectedFullName,
    documentType,
  };
}

/**
 * Invocación directa AWS Signature V4 a Amazon Rekognition CompareFaces
 */
async function compareFacesAwsRekognition(
  sourceSelfie: Buffer,
  targetIdFront: Buffer,
  minThreshold = MIN_SIMILARITY_THRESHOLD
): Promise<{ matched: boolean; similarity: number; unmatchedFacesCount: number }> {
  const resp = await invokeAwsRekognition('CompareFaces', {
    SourceImage: { Bytes: sourceSelfie.toString('base64') },
    TargetImage: { Bytes: targetIdFront.toString('base64') },
    SimilarityThreshold: 1,
  });

  if (!resp.ok) {
    const errCode = resp.data?.Code || resp.data?.__type || '';
    if (errCode.includes('InvalidParameterException')) {
      const noFaceErr: any = new Error(
        'No se detectó un rostro humano claro en la captura facial o en el frente de tu cédula.'
      );
      noFaceErr.statusCode = 422;
      noFaceErr.code = 'NO_FACE_DETECTED';
      throw noFaceErr;
    }

    logger.error(`AWS Rekognition error HTTP ${resp.status}: ${resp.rawText.slice(0, 220)}`);
    const svcErr: any = new Error(
      'No fue posible completar la validación biométrica facial en este momento. Intenta de nuevo en unos segundos.'
    );
    svcErr.statusCode = 503;
    throw svcErr;
  }

  const json: any = resp.data;
  const matches = Array.isArray(json?.FaceMatches) ? json.FaceMatches : [];
  const unmatched = Array.isArray(json?.UnmatchedFaces) ? json.UnmatchedFaces : [];

  matches.sort((a: any, b: any) => Number(b?.Similarity || 0) - Number(a?.Similarity || 0));
  const topMatch = matches[0] || null;
  const similarity = topMatch?.Similarity ? Math.round(Number(topMatch.Similarity) * 100) / 100 : 0;

  return {
    matched: similarity >= minThreshold,
    similarity,
    unmatchedFacesCount: unmatched.length,
  };
}

const SPOOF_DOCUMENT_LABELS = new Set([
  'Id Cards',
  'Document',
  'Driving License',
  'Passport',
  'Credit Card',
  'Business Card',
  'Paper',
  'Page',
  'Poster',
  'Flyer',
  'Postcard',
  'Picture Frame',
  'Sticker',
]);

const SPOOF_SCREEN_LABELS = new Set([
  'Mobile Phone',
  'Cell Phone',
  'Phone',
  'Screen',
  'Monitor',
  'Display',
  'Laptop',
  'Tablet Computer',
  'Television',
  'Computer Hardware',
]);

const ID_SPOOF_TEXT_KEYWORDS = [
  'COLOMBIA',
  'REPUBLICA',
  'CEDULA',
  'CIUDADANIA',
  'IDENTIFICACION',
  'APELLIDO',
  'NOMBRE',
  'NUMERO',
  'NUIP',
  'REGISTRADURIA',
  'NACIMIENTO',
  'EXPEDICION',
  'ESTATURA',
  'INDICE',
];

interface LiveFrameBioProfile {
  smile: boolean;
  smileScore: number;
  mouthOpen: boolean;
  mouthOpenScore: number;
  eyesOpen: boolean;
  yaw: number;
  pitch: number;
  roll: number;
  boxHeight: number;
  boxWidth: number;
}

/**
 * Presentation Attack Detection (PAD - ISO 30107-3):
 * Bloquea el uso de una cédula física, fotografía impresa o pantalla de otro celular/monitor
 * frente a la cámara de selfie, y extrae la geometría 3D/muscular del rostro humano en vivo.
 */
async function analyzeLiveFrameAntiSpoofing(
  normalizedJpeg: Buffer,
  frameLabel: string
): Promise<LiveFrameBioProfile> {
  const b64 = normalizedJpeg.toString('base64');

  const [labelsResp, textResp, facesResp] = await Promise.all([
    invokeAwsRekognition('DetectLabels', {
      Image: { Bytes: b64 },
      MaxLabels: 25,
      MinConfidence: 62,
    }),
    invokeAwsRekognition('DetectText', {
      Image: { Bytes: b64 },
    }),
    invokeAwsRekognition('DetectFaces', {
      Image: { Bytes: b64 },
      Attributes: ['ALL'],
    }),
  ]);

  // 1. Bloquear documentos físicos, papel, marcos o pantallas electrónicas frente al lente
  const labels: any[] = Array.isArray(labelsResp.data?.Labels) ? labelsResp.data.Labels : [];
  for (const lbl of labels) {
    const name = String(lbl?.Name || '');
    const conf = Number(lbl?.Confidence || 0);

    if (SPOOF_DOCUMENT_LABELS.has(name) && conf >= 65) {
      logger.warn(`🚫 [PAD Anti-Spoof] Documento/foto física detectada en ${frameLabel}: ${name} (${conf.toFixed(1)}%)`);
      const err: any = new Error(
        'Alerta antifraude: Se detectó una cédula, fotografía impresa o documento frente a la cámara. Debes mostrar únicamente tu rostro real en vivo.'
      );
      err.statusCode = 422;
      err.code = 'SPOOF_DOCUMENT_DETECTED';
      throw err;
    }

    if (SPOOF_SCREEN_LABELS.has(name) && conf >= 68) {
      logger.warn(`🚫 [PAD Anti-Spoof] Pantalla/dispositivo detectado en ${frameLabel}: ${name} (${conf.toFixed(1)}%)`);
      const err: any = new Error(
        'Alerta antifraude: Se detectó la pantalla de otro teléfono o monitor frente a la cámara. Realiza el escaneo con tu rostro real en vivo.'
      );
      err.statusCode = 422;
      err.code = 'SPOOF_SCREEN_DETECTED';
      throw err;
    }
  }

  // 2. Bloquear texto propio de cédulas/documentos dentro de la captura facial en vivo
  const textLines: any[] = Array.isArray(textResp.data?.TextDetections)
    ? textResp.data.TextDetections.filter((t: any) => t?.Type === 'LINE' && Number(t?.Confidence || 0) >= 75)
    : [];

  const upperAllText = textLines.map((t) => String(t.DetectedText || '').toUpperCase()).join(' ');
  const matchedIdKeyword = ID_SPOOF_TEXT_KEYWORDS.find((kw) => upperAllText.includes(kw));

  if (matchedIdKeyword || textLines.length >= 4) {
    logger.warn(
      `🚫 [PAD Anti-Spoof] Texto documental detectado en selfie (${frameLabel}): kw=${matchedIdKeyword || 'multi-line'}`
    );
    const err: any = new Error(
      'Alerta antifraude: No se permite usar la foto de la cédula ni imágenes con texto en la prueba de rostro en vivo.'
    );
    err.statusCode = 422;
    err.code = 'SPOOF_ID_CARD_IN_SELFIE';
    throw err;
  }

  // 3. Validar anatomía y proporción real de rostro humano frente a cámara frontal
  const faces: any[] = Array.isArray(facesResp.data?.FaceDetails) ? facesResp.data.FaceDetails : [];
  if (faces.length === 0) {
    const err: any = new Error(
      'No se detectó un rostro humano frente a la cámara. Encuadra tu cara dentro del óvalo con buena iluminación.'
    );
    err.statusCode = 422;
    err.code = 'NO_LIVE_FACE';
    throw err;
  }

  // Seleccionar rostro principal por área
  faces.sort(
    (a, b) =>
      Number(b?.BoundingBox?.Width || 0) * Number(b?.BoundingBox?.Height || 0) -
      Number(a?.BoundingBox?.Width || 0) * Number(a?.BoundingBox?.Height || 0)
  );
  const f = faces[0];
  const boxH = Number(f?.BoundingBox?.Height || 0);
  const boxW = Number(f?.BoundingBox?.Width || 0);

  if (boxH < 0.16 || boxW < 0.12) {
    const err: any = new Error(
      'Tu rostro se ve demasiado pequeño o lejano (típico de retratos impresos). Acerca tu rostro al óvalo de la cámara frontal.'
    );
    err.statusCode = 422;
    err.code = 'FACE_TOO_SMALL_OR_PRINTED';
    throw err;
  }

  if (f?.Sunglasses?.Value === true && Number(f?.Sunglasses?.Confidence || 0) >= 80) {
    const err: any = new Error('Por favor retira las gafas oscuras para validar tus rasgos en vivo.');
    err.statusCode = 422;
    throw err;
  }

  const smileVal = Boolean(f?.Smile?.Value);
  const smileConf = Number(f?.Smile?.Confidence || 0);
  // Puntuación continua [0..100] de sonrisa (0 = completamente serio, 100 = sonrisa amplia)
  const smileScore = smileVal ? smileConf : Math.max(0, 100 - smileConf);

  const mouthVal = Boolean(f?.MouthOpen?.Value);
  const mouthConf = Number(f?.MouthOpen?.Confidence || 0);
  const mouthOpenScore = mouthVal ? mouthConf : Math.max(0, 100 - mouthConf);

  return {
    smile: smileVal,
    smileScore,
    mouthOpen: mouthVal,
    mouthOpenScore,
    eyesOpen: f?.EyesOpen?.Value !== false,
    yaw: Number(f?.Pose?.Yaw || 0),
    pitch: Number(f?.Pose?.Pitch || 0),
    roll: Number(f?.Pose?.Roll || 0),
    boxHeight: boxH,
    boxWidth: boxW,
  };
}

function signTokenPayload(payload: Record<string, unknown>): string {
  const jsonB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', env.JWT_SECRET)
    .update(jsonB64, 'utf8')
    .digest('base64url');
  return `${jsonB64}.${sig}`;
}

function verifyTokenPayload<T = any>(token?: string): T | null {
  if (!token || !token.includes('.')) return null;
  const [jsonB64, sig] = token.split('.');
  const expected = crypto
    .createHmac('sha256', env.JWT_SECRET)
    .update(jsonB64, 'utf8')
    .digest('base64url');
  if (sig !== expected) return null;
  try {
    const parsed = JSON.parse(Buffer.from(jsonB64, 'base64url').toString('utf8'));
    if (parsed.exp && Date.now() > Number(parsed.exp)) return null;
    return parsed as T;
  } catch {
    return null;
  }
}

export class KycVerificationService {
  /**
   * Emite un reto biomecánico aleatorio firmado criptográficamente (expira en 5 min)
   * que una fotografía fija o cédula física jamás puede ejecutar entre el Frame 1 y el Frame 2.
   */
  static issueLivenessChallenge(): {
    challengeType: LivenessChallengeType;
    step1Prompt: string;
    step2Prompt: string;
    challengeToken: string;
  } {
    const challenges: Array<{
      type: LivenessChallengeType;
      step1: string;
      step2: string;
    }> = [
      {
        type: 'smile',
        step1: 'Mantén expresión seria mirando al frente',
        step2: '¡Ahora sonríe ampliamente!',
      },
      {
        type: 'open_mouth',
        step1: 'Mira al frente con los labios cerrados',
        step2: '¡Ahora abre la boca claramente!',
      },
      {
        type: 'turn_head',
        step1: 'Mira totalmente de frente al lente',
        step2: '¡Ahora gira un poco tu rostro hacia un lado!',
      },
    ];

    const chosen = challenges[Math.floor(Math.random() * challenges.length)];
    const challengeToken = signTokenPayload({
      challengeType: chosen.type,
      nonce: crypto.randomBytes(8).toString('hex'),
      exp: Date.now() + 5 * 60 * 1000,
    });

    return {
      challengeType: chosen.type,
      step1Prompt: chosen.step1,
      step2Prompt: chosen.step2,
      challengeToken,
    };
  }

  /**
   * Analiza el documento de identidad con IA (AWS Rekognition DetectText + DetectFaces en paralelo):
   * - En el frente: exige que haya retrato facial impreso y extrae automáticamente Nombres, Apellidos y Cédula/NUIP.
   * - En el reverso: verifica nitidez óptica y texto de respaldo documental.
   */
  static async analyzeIdDocumentPreview(input: {
    imageBase64?: string;
    side?: 'front' | 'back';
  }): Promise<{
    valid: boolean;
    side: 'front' | 'back';
    documentType: string;
    detectedCedula: string | null;
    detectedFullName: string | null;
    faceConfidence: number | null;
  }> {
    if (!input.imageBase64) {
      const err: any = new Error('No se recibió la captura del documento.');
      err.statusCode = 422;
      throw err;
    }

    const side = input.side === 'back' ? 'back' : 'front';
    const rawBuf = decodeBase64Image(input.imageBase64);
    const info = await inspectAndNormalizeImage(
      rawBuf,
      side === 'front' ? 'frente de cédula' : 'reverso de cédula'
    );

    const b64Bytes = info.normalized.toString('base64');

    if (side === 'front') {
      const [textResp, faceResp] = await Promise.all([
        invokeAwsRekognition('DetectText', { Image: { Bytes: b64Bytes } }),
        invokeAwsRekognition('DetectFaces', {
          Image: { Bytes: b64Bytes },
          Attributes: ['DEFAULT'],
        }),
      ]);

      const faces = Array.isArray(faceResp.data?.FaceDetails) ? faceResp.data.FaceDetails : [];
      if (faceResp.ok && faces.length === 0) {
        const noPortraitErr: any = new Error(
          'No se detectó tu retrato facial en la imagen. Enfoca el FRENTE de tu cédula sobre una superficie iluminada.'
        );
        noPortraitErr.statusCode = 422;
        throw noPortraitErr;
      }

      const topFaceConf =
        faces.length > 0 ? Math.round(Number(faces[0]?.Confidence || 99) * 10) / 10 : null;

      const lines: string[] = Array.isArray(textResp.data?.TextDetections)
        ? textResp.data.TextDetections.filter((t: any) => t?.Type === 'LINE').map(
            (t: any) => String(t.DetectedText || '')
          )
        : [];

      const extracted = extractColombianIdIntelligence(lines);

      return {
        valid: true,
        side: 'front',
        documentType: extracted.documentType,
        detectedCedula: extracted.detectedCedula,
        detectedFullName: extracted.detectedFullName,
        faceConfidence: topFaceConf,
      };
    }

    // Reverso: lectura óptica rápida para confirmar documento legible
    const backTextResp = await invokeAwsRekognition('DetectText', {
      Image: { Bytes: b64Bytes },
    });
    const backLines: string[] = Array.isArray(backTextResp.data?.TextDetections)
      ? backTextResp.data.TextDetections.filter((t: any) => t?.Type === 'LINE').map(
          (t: any) => String(t.DetectedText || '')
        )
      : [];

    if (backTextResp.ok && backLines.length === 0) {
      const unreadableBackErr: any = new Error(
        'No se logró leer información en el reverso del documento. Acerca un poco más la cámara evitando reflejos.'
      );
      unreadableBackErr.statusCode = 422;
      throw unreadableBackErr;
    }

    const backExtracted = extractColombianIdIntelligence(backLines);

    return {
      valid: true,
      side: 'back',
      documentType: backExtracted.documentType,
      detectedCedula: backExtracted.detectedCedula,
      detectedFullName: backExtracted.detectedFullName,
      faceConfidence: null,
    };
  }

  /**
   * Prueba de Vida Activa en 2 Fotogramas + PAD Antisuplantación (ISO 30107-3):
   * 1. Bloquea cédulas, fotos impresas y pantallas de celular (DetectLabels + DetectText).
   * 2. Exige transición biomecánica real entre Fotograma 1 (neutro) y Fotograma 2 (reto firmado).
   * 3. Exige continuidad de identidad (Frame 1 vs Frame 2 >= 88%) + cruce con Cédula (Frame 1 vs Cédula >= 85%).
   * 4. Emite livenessProofToken firmado para autorizar el registro final.
   */
  static async verifyFaceMatchPreview(input: {
    idCardFront?: string;
    selfieNeutral?: string;
    selfiePhoto?: string;
    challengeToken?: string;
  }): Promise<{
    verified: boolean;
    similarityScore: number;
    livenessProofToken: string;
  }> {
    if (!input.idCardFront || !input.selfieNeutral || !input.selfiePhoto || !input.challengeToken) {
      const err: any = new Error(
        'Debes completar la prueba de vida interactiva en cámara frontal en vivo para verificar tu identidad.'
      );
      err.statusCode = 422;
      err.code = 'LIVENESS_INCOMPLETE';
      throw err;
    }

    const challengePayload = verifyTokenPayload<{ challengeType: LivenessChallengeType }>(
      input.challengeToken
    );
    if (!challengePayload?.challengeType) {
      const err: any = new Error(
        'El reto de prueba de vida expiró. Toca nuevamente iniciar escaneo en vivo.'
      );
      err.statusCode = 422;
      err.code = 'CHALLENGE_EXPIRED';
      throw err;
    }

    const rawFront = decodeBase64Image(input.idCardFront);
    const rawNeutral = decodeBase64Image(input.selfieNeutral);
    const rawAction = decodeBase64Image(input.selfiePhoto);

    const hashFront = sha256Hex(rawFront);
    const hashNeutral = sha256Hex(rawNeutral);
    const hashAction = sha256Hex(rawAction);

    if (
      hashFront === hashNeutral ||
      hashFront === hashAction ||
      hashNeutral === hashAction
    ) {
      const err: any = new Error(
        'Las capturas de prueba de vida deben ser fotogramas en tiempo real distintos.'
      );
      err.statusCode = 422;
      throw err;
    }

    const [frontInfo, neutralInfo, actionInfo] = await Promise.all([
      inspectAndNormalizeImage(rawFront, 'frente de cédula'),
      inspectAndNormalizeImage(rawNeutral, 'fotograma base en vivo'),
      inspectAndNormalizeImage(rawAction, 'fotograma de gesto en vivo'),
    ]);

    // 1. PAD Anti-Spoofing + Geometría facial en AMBOS fotogramas en vivo
    const [frame1Bio, frame2Bio] = await Promise.all([
      analyzeLiveFrameAntiSpoofing(neutralInfo.normalized, 'frame_1_base'),
      analyzeLiveFrameAntiSpoofing(actionInfo.normalized, 'frame_2_action'),
    ]);

    if (!frame1Bio.eyesOpen && !frame2Bio.eyesOpen) {
      const err: any = new Error(
        'Mantén los ojos abiertos mirando a la cámara durante la prueba de vida.'
      );
      err.statusCode = 422;
      throw err;
    }

    // 2. Validar transición muscular / rotación 3D real entre Fotograma 1 y Fotograma 2
    const cType = challengePayload.challengeType;
    let passedLivenessAction = false;

    if (cType === 'smile') {
      const deltaSmile = frame2Bio.smileScore - frame1Bio.smileScore;
      passedLivenessAction =
        frame2Bio.smile && frame2Bio.smileScore >= 72 && deltaSmile >= 24;
      if (!passedLivenessAction) {
        const err: any = new Error(
          'Prueba de vida no superada: primero debes mantener expresión seria y luego sonreír claramente en vivo (las fotografías o cédulas quedan bloqueadas).'
        );
        err.statusCode = 422;
        err.code = 'LIVENESS_SMILE_FAILED';
        throw err;
      }
    } else if (cType === 'open_mouth') {
      const deltaMouth = frame2Bio.mouthOpenScore - frame1Bio.mouthOpenScore;
      passedLivenessAction =
        frame2Bio.mouthOpen && frame2Bio.mouthOpenScore >= 70 && deltaMouth >= 24;
      if (!passedLivenessAction) {
        const err: any = new Error(
          'Prueba de vida no superada: primero mantén los labios cerrados y luego abre la boca claramente frente a la cámara.'
        );
        err.statusCode = 422;
        err.code = 'LIVENESS_MOUTH_FAILED';
        throw err;
      }
    } else if (cType === 'turn_head') {
      const deltaYaw = Math.abs(frame2Bio.yaw - frame1Bio.yaw);
      const deltaRoll = Math.abs(frame2Bio.roll - frame1Bio.roll);
      passedLivenessAction =
        Math.abs(frame1Bio.yaw) <= 18 && deltaYaw >= 11 && deltaRoll <= 22;
      if (!passedLivenessAction) {
        const err: any = new Error(
          'Prueba de vida no superada: gira suavemente tu cabeza hacia un lado sin inclinar el celular (una imagen plana no tiene rotación 3D real).'
        );
        err.statusCode = 422;
        err.code = 'LIVENESS_YAW_FAILED';
        throw err;
      }
    }

    // 3. Continuidad biométrica (Frame 1 === Frame 2) + Identidad contra Cédula (Frame 1 === Cédula)
    const [continuityMatch, idCardMatch] = await Promise.all([
      compareFacesAwsRekognition(actionInfo.normalized, neutralInfo.normalized, 88),
      compareFacesAwsRekognition(neutralInfo.normalized, frontInfo.normalized, MIN_SIMILARITY_THRESHOLD),
    ]);

    if (!continuityMatch.matched) {
      const err: any = new Error(
        'Alerta antifraude: Se detectó un cambio de rostro entre el inicio y el fin de la prueba de vida.'
      );
      err.statusCode = 422;
      err.code = 'LIVENESS_CONTINUITY_BROKEN';
      throw err;
    }

    if (!idCardMatch.matched) {
      logger.warn(
        `🚫 Intento bloqueado: persona viva NO coincide con titular de cédula (${idCardMatch.similarity}%)`
      );
      const mismatchErr: any = new Error(
        `Identidad rechazada: Tu rostro en vivo no coincide con el titular de la cédula (${idCardMatch.similarity.toFixed(
          1
        )}% de similitud; mínimo requerido ${MIN_SIMILARITY_THRESHOLD}%).`
      );
      mismatchErr.statusCode = 422;
      mismatchErr.code = 'BIOMETRIC_MISMATCH';
      mismatchErr.similarityScore = idCardMatch.similarity;
      throw mismatchErr;
    }

    const livenessProofToken = signTokenPayload({
      frontHash: hashFront,
      selfieHash: hashNeutral,
      similarity: idCardMatch.similarity,
      challengeType: cType,
      exp: Date.now() + 15 * 60 * 1000,
    });

    logger.info(
      `✅ Prueba de vida activa (${cType}) + PAD antisuplantación superada (similitud: ${idCardMatch.similarity}%)`
    );

    return {
      verified: true,
      similarityScore: idCardMatch.similarity,
      livenessProofToken,
    };
  }

  /**
   * Valida autenticidad estructural de imágenes KYC (resolución, entropía, anti-duplicado),
   * exige token criptográfico de Prueba de Vida Activa + PAD antisuplantación,
   * y cifra los documentos con AES-256-GCM conforme a la Ley 1581.
   */
  static async evaluateAndEncryptKyc(
    bundle: KycInputBundle
  ): Promise<KycEvaluationResult> {
    if (!bundle.idCardFront || !bundle.idCardBack || !bundle.selfiePhoto) {
      const err: any = new Error(
        'La verificación documental (frente y respaldo de cédula) y la prueba de rostro en vivo son obligatorias.'
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

    // 2. Exigir certificado criptográfico de Prueba de Vida Activa emitido por verifyFaceMatchPreview
    const proof = verifyTokenPayload<{
      frontHash: string;
      selfieHash: string;
      similarity: number;
      challengeType: string;
    }>(bundle.livenessProofToken);

    if (!proof || proof.frontHash !== hashFront || proof.selfieHash !== hashSelfie) {
      const err: any = new Error(
        'Debes superar la prueba de vida activa en tiempo real antes de registrar la cuenta. No se aceptan fotografías estáticas ni documentos.'
      );
      err.statusCode = 422;
      err.code = 'LIVENESS_PROOF_REQUIRED';
      throw err;
    }

    // 3. Inspección óptica + verificación final PAD en servidor
    const [frontInfo, backInfo, selfieInfo] = await Promise.all([
      inspectAndNormalizeImage(rawFront, 'anverso de cédula'),
      inspectAndNormalizeImage(rawBack, 'reverso de cédula'),
      inspectAndNormalizeImage(rawSelfie, 'rostro biométrico'),
    ]);

    await analyzeLiveFrameAntiSpoofing(selfieInfo.normalized, 'register_final_selfie');

    const bio = await compareFacesAwsRekognition(
      selfieInfo.normalized,
      frontInfo.normalized
    );

    if (!bio.matched) {
      logger.warn(
        `🚫 Registro bloqueado en servidor: suplantación o rostro distinto (${bio.similarity}% < ${MIN_SIMILARITY_THRESHOLD}%)`
      );
      const rejectErr: any = new Error(
        `Identidad biométrica rechazada: El rostro en vivo no coincide con el documento de identidad (${bio.similarity.toFixed(
          1
        )}% de similitud).`
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

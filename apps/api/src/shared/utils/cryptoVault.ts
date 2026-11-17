import crypto from 'crypto';
import { env } from '../../config/env';

const VAULT_SALT = 'rc-ley1581-vault-v1';

function getMasterKey(): Buffer {
  const secret = process.env.VAULT_ENCRYPTION_KEY || env.JWT_SECRET;
  return crypto.scryptSync(secret, VAULT_SALT, 32);
}

/**
 * Cifra un Buffer con AES-256-GCM autenticado (cumplimiento Ley 1581 de Habeas Data).
 * Formato de salida: ivHex:authTagHex:ciphertextBase64
 */
export function encryptBuffer(plain: Buffer): string {
  const key = getMasterKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('base64')}`;
}

/**
 * Descifra un payload AES-256-GCM y verifica integridad criptográfica.
 */
export function decryptBuffer(serialized: string): Buffer {
  const parts = serialized.split(':');
  if (parts.length !== 3) {
    throw new Error('Formato de bóveda cifrada inválido');
  }
  const [ivHex, tagHex, cipherB64] = parts;
  const key = getMasterKey();
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(ivHex, 'hex')
  );
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([
    decipher.update(Buffer.from(cipherB64, 'base64')),
    decipher.final(),
  ]);
}

export function sha256Hex(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Genera una URL temporal firmada con HMAC-SHA256 para reproducir evidencia acústica
 * en la consola del operador sin exponer endpoints públicos abiertos.
 */
export function signEvidenceStreamUrl(
  evidenceId: string,
  apiBaseUrl: string,
  ttlSeconds = 3600
): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const sig = crypto
    .createHmac('sha256', getMasterKey())
    .update(`evidence:${evidenceId}:${exp}`)
    .digest('hex');

  const cleanBase = apiBaseUrl.replace(/\/+$/, '');
  return `${cleanBase}/api/mobile/evidence/stream/${evidenceId}?exp=${exp}&sig=${sig}`;
}

export function verifyEvidenceStreamSignature(
  evidenceId: string,
  expRaw: string | undefined,
  sigRaw: string | undefined
): boolean {
  if (!expRaw || !sigRaw || !/^[0-9a-f]{64}$/i.test(sigRaw)) return false;
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) {
    return false;
  }

  const expected = crypto
    .createHmac('sha256', getMasterKey())
    .update(`evidence:${evidenceId}:${exp}`)
    .digest('hex');

  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(sigRaw, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

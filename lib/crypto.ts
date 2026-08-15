import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

// AES-256-GCM secret storage for integration credentials (AADE myDATA).
// The key is derived from AXION_ENCRYPTION_KEY via sha256, so any sufficiently
// long random string works as the env value. Ciphertext format:
//   v1.<iv b64>.<auth tag b64>.<data b64>

function deriveKey(): Buffer {
  const secret = process.env.AXION_ENCRYPTION_KEY
  if (!secret || secret.length < 16) {
    throw new Error('AXION_ENCRYPTION_KEY must be set (>= 16 chars) to store integration credentials')
  }
  return createHash('sha256').update(secret).digest()
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', deriveKey(), iv)
  const data = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), data.toString('base64')].join('.')
}

export function decryptSecret(stored: string): string {
  const [version, ivB64, tagB64, dataB64] = stored.split('.')
  if (version !== 'v1' || !ivB64 || !tagB64 || !dataB64) {
    throw new Error('Unrecognized ciphertext format')
  }
  const decipher = createDecipheriv('aes-256-gcm', deriveKey(), Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
  return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8')
}

// Masks a secret for display: keeps the first 3 chars, hides the rest.
export function maskSecret(value: string): string {
  if (value.length <= 3) return '•••'
  return value.slice(0, 3) + '•'.repeat(Math.min(value.length - 3, 12))
}

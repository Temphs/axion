import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

// Password hashing (scrypt, per-user salt). Kept free of Next/Prisma imports so
// it can be unit-tested directly.

const scrypt = promisify(scryptCb)
const KEY_LEN = 64

export const PASSWORD_MIN = 8
// Upper bound so a multi-megabyte "password" can't tie up scrypt.
export const PASSWORD_MAX = 256

// Returns a user-facing problem with a proposed new password, or null if it's acceptable.
export function passwordProblem(password: unknown): string | null {
  if (typeof password !== 'string' || password.length < PASSWORD_MIN) {
    return `Password must be at least ${PASSWORD_MIN} characters`
  }
  if (password.length > PASSWORD_MAX) return `Password must be at most ${PASSWORD_MAX} characters`
  return null
}

// The same visible text can arrive as different bytes: macOS/iOS keyboards tend
// to send an accented Greek letter such as "έ" decomposed (ε + combining accent,
// NFD), Windows and Android composed (NFC). Hashing raw bytes made a correct
// password fail on another device, so passwords are hashed in NFC.
function canonical(password: string): string {
  return password.normalize('NFC')
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const derived = (await scrypt(canonical(password), salt, KEY_LEN)) as Buffer
  return `${salt}:${derived.toString('hex')}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, key] = stored.split(':')
  if (!salt || !key) return false
  const keyBuf = Buffer.from(key, 'hex')
  if (keyBuf.length !== KEY_LEN) return false

  // NFC first (every hash made from now on). Hashes made before normalisation
  // were taken over whatever bytes the device sent, so the NFD and as-typed
  // forms are also tried. For plain ASCII all three are the same string and
  // scrypt runs once.
  const candidates = [...new Set([canonical(password), password.normalize('NFD'), password])]
  for (const candidate of candidates) {
    const derived = (await scrypt(candidate, salt, KEY_LEN)) as Buffer
    if (timingSafeEqual(keyBuf, derived)) return true
  }
  return false
}

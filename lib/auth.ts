import { cookies } from 'next/headers'
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { prisma } from '@/lib/db'

const scrypt = promisify(scryptCb)

const SESSION_COOKIE = 'axion_session'
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30 // 30 days
const KEY_LEN = 64

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const derived = (await scrypt(password, salt, KEY_LEN)) as Buffer
  return `${salt}:${derived.toString('hex')}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, key] = stored.split(':')
  if (!salt || !key) return false
  const derived = (await scrypt(password, salt, KEY_LEN)) as Buffer
  const keyBuf = Buffer.from(key, 'hex')
  if (keyBuf.length !== derived.length) return false
  return timingSafeEqual(keyBuf, derived)
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
  await prisma.session.create({ data: { token, userId, expiresAt } })

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  })
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (token) await prisma.session.deleteMany({ where: { token } })
  cookieStore.delete(SESSION_COOKIE)
}

export type SessionUser = { id: string; email: string; name: string | null; createdAt: Date }

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  })
  if (!session) return null

  if (session.expiresAt < new Date()) {
    await prisma.session.deleteMany({ where: { token } })
    return null
  }

  const { id, email, name, createdAt } = session.user
  return { id, email, name, createdAt }
}

// --- API keys (companion-app machine credentials) ------------------------

const API_KEY_PREFIX = 'axion_sk_'

export function hashApiKey(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

// A 256-bit random token is high-entropy, so sha256 (not slow hashing) is sufficient.
export function generateApiKey(): { token: string; prefix: string; hashedKey: string } {
  const token = API_KEY_PREFIX + randomBytes(32).toString('hex')
  return {
    token,
    prefix: token.slice(0, API_KEY_PREFIX.length + 6),
    hashedKey: hashApiKey(token),
  }
}

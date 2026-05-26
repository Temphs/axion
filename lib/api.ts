import { getCurrentUser, hashApiKey, type SessionUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export function ok(data: unknown, init?: ResponseInit): Response {
  return Response.json(data, init)
}

export function fail(message: string, status = 400): Response {
  return Response.json({ error: message }, { status })
}

export async function readJson<T = Record<string, unknown>>(
  request: Request
): Promise<T | null> {
  try {
    return (await request.json()) as T
  } catch {
    return null
  }
}

// Returns the authenticated manager, or a 401 Response to return early.
export async function authed(): Promise<
  { user: SessionUser; res: null } | { user: null; res: Response }
> {
  const user = await getCurrentUser()
  if (!user) return { user: null, res: fail('Unauthorized', 401) }
  return { user, res: null }
}

export type Principal =
  | { kind: 'user'; user: SessionUser }
  | { kind: 'apiKey'; apiKeyId: string }

function extractToken(request: Request): string | null {
  const auth = request.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) return auth.slice(7).trim() || null
  return request.headers.get('x-api-key')?.trim() || null
}

// Accepts either a manager session (cookie) or a valid API key (Authorization: Bearer / x-api-key).
// Used on the ingestion surface the companion app calls.
export async function authedAny(
  request: Request
): Promise<{ principal: Principal; res: null } | { principal: null; res: Response }> {
  const token = extractToken(request)
  if (token) {
    const key = await prisma.apiKey.findUnique({ where: { hashedKey: hashApiKey(token) } })
    if (!key || key.revokedAt) return { principal: null, res: fail('Invalid API key', 401) }
    await prisma.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } })
    return { principal: { kind: 'apiKey', apiKeyId: key.id }, res: null }
  }

  const user = await getCurrentUser()
  if (user) return { principal: { kind: 'user', user }, res: null }
  return { principal: null, res: fail('Unauthorized', 401) }
}

function prismaCode(e: unknown): string | undefined {
  return e && typeof e === 'object' && 'code' in e ? (e as { code?: string }).code : undefined
}

// P2002: unique constraint failed.
export function isUniqueViolation(e: unknown): boolean {
  return prismaCode(e) === 'P2002'
}

// P2025: record not found. P2003: foreign-key constraint (e.g. onDelete: Restrict blocked it).
export function isNotFound(e: unknown): boolean {
  return prismaCode(e) === 'P2025'
}

export function isForeignKeyConstraint(e: unknown): boolean {
  return prismaCode(e) === 'P2003'
}

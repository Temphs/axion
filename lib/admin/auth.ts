import 'server-only'
import { notFound } from 'next/navigation'
import { getCurrentUser, type SessionUser } from '@/lib/auth'
import { fail } from '@/lib/api'

// The platform admin is whoever's account email is listed in ADMIN_EMAILS
// (comma-separated, set in Vercel). Not a database flag, so no request can
// grant it. Signup has no email verification yet, so only list addresses that
// already have an account: otherwise someone could register one of them.

function adminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  )
}

export function isAdmin(user: { email: string } | null): boolean {
  return !!user && adminEmails().has(user.email.toLowerCase())
}

// Pages: anyone who isn't the admin gets a plain 404, so the console's
// existence isn't revealed.
export async function requireAdminPage(): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (!user || !isAdmin(user)) notFound()
  return user
}

// API routes: 404 for non-admins; state-changing requests must also come from
// this site (Origin check on top of the SameSite cookie).
export async function adminApi(
  request: Request
): Promise<{ user: SessionUser; res: null } | { user: null; res: Response }> {
  const user = await getCurrentUser()
  if (!user || !isAdmin(user)) return { user: null, res: fail('Not found', 404) }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const origin = request.headers.get('origin')
    const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
    if (!origin || !host || new URL(origin).host !== host) return { user: null, res: fail('Bad origin', 403) }
  }
  return { user, res: null }
}

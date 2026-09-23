import { ok, fail, readJson } from '@/lib/api'
import { rateLimit } from '@/lib/rateLimit'
import { createLogEntry, getLogPageData } from '@/lib/employeeLog'

// Public surface: authenticated by the token itself, not a session or API
// key. No `authed()`/`authedAny()` here on purpose — this is what an employee
// with no Axion account hits from their phone.

export async function GET(_req: Request, ctx: RouteContext<'/api/log/[token]'>) {
  const { token } = await ctx.params
  const limited = rateLimit(`log-read:${token}`, 60, 60_000)
  if (!limited.ok) return fail('Πολλά αιτήματα, δοκίμασε ξανά σε λίγο.', 429)

  const data = await getLogPageData(token)
  if (!data) return fail('Not found', 404)
  return ok(data)
}

export async function POST(request: Request, ctx: RouteContext<'/api/log/[token]'>) {
  const { token } = await ctx.params
  // One employee typing entries by hand won't come close to this; it exists
  // to cap the damage if a link leaks (see the API-key routes' cost lesson).
  const limited = rateLimit(`log-write:${token}`, 20, 60_000)
  if (!limited.ok) return fail('Πολλά αιτήματα, δοκίμασε ξανά σε λίγο.', 429)

  const body = await readJson<{ clientId?: unknown; date?: unknown; hours?: unknown; workType?: unknown; notes?: unknown }>(
    request
  )
  if (!body) return fail('Μη έγκυρα δεδομένα.')

  const result = await createLogEntry(token, body)
  if ('error' in result) return fail(result.error, result.error.startsWith('Ο σύνδεσμος') ? 404 : 400)
  return ok({ entry: result.entry })
}

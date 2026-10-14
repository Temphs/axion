import { after } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { clientIp, rateLimit } from '@/lib/rateLimit'
import { recordError } from '@/lib/monitoring/record'

const MAX_BODY = 16_000
const KINDS = new Set(['window', 'unhandledrejection', 'boundary'])

// Browser error reports. Public by necessity (errors happen to logged-out
// visitors too), so it is rate-limited, size-capped, and everything stored is
// scrubbed and normalised in recordError. Always answers 204: a reporter must
// never get feedback it could act on, or cause the page to retry.
export async function POST(request: Request) {
  const limited = rateLimit(`telemetry-error:${clientIp(request)}`, 20, 10 * 60_000)
  if (!limited.ok) return new Response(null, { status: 204 })

  const text = await request.text().catch(() => '')
  if (!text || text.length > MAX_BODY) return new Response(null, { status: 204 })
  let body: { kind?: unknown; message?: unknown; stack?: unknown; route?: unknown }
  try {
    body = JSON.parse(text)
  } catch {
    return new Response(null, { status: 204 })
  }
  if (typeof body.message !== 'string' || !body.message) return new Response(null, { status: 204 })

  const user = await getCurrentUser().catch(() => null)
  after(() =>
    recordError({
      source: 'client',
      kind: typeof body.kind === 'string' && KINDS.has(body.kind) ? body.kind : 'window',
      route: typeof body.route === 'string' ? body.route : null,
      message: body.message as string,
      stack: typeof body.stack === 'string' ? body.stack : null,
      userId: user?.id ?? null,
    })
  )
  return new Response(null, { status: 204 })
}

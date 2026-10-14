import { after } from 'next/server'
import { clientIp, rateLimit } from '@/lib/rateLimit'
import { recordPageView } from '@/lib/monitoring/record'
import { deviceOf, isBot, normalizePath, referrerHost } from '@/lib/monitoring/scrub'

// Cookieless page-view counter. Nothing identifying is stored: the path is
// normalised (ids and link tokens removed), the referrer is reduced to an
// external host, and the IP is only used in memory for rate limiting.
export async function POST(request: Request) {
  const ua = request.headers.get('user-agent')
  if (isBot(ua)) return new Response(null, { status: 204 })
  const limited = rateLimit(`telemetry-view:${clientIp(request)}`, 120, 10 * 60_000)
  if (!limited.ok) return new Response(null, { status: 204 })

  const text = await request.text().catch(() => '')
  if (!text || text.length > 2_000) return new Response(null, { status: 204 })
  let body: { path?: unknown; referrer?: unknown }
  try {
    body = JSON.parse(text)
  } catch {
    return new Response(null, { status: 204 })
  }

  const path = normalizePath(body.path)
  // The admin's own visits and API paths are not traffic.
  if (/^\/(el|en)\/admin(\/|$)|^\/api\//.test(path)) return new Response(null, { status: 204 })

  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  const view = {
    path,
    referrer: referrerHost(body.referrer, host),
    country: (request.headers.get('x-vercel-ip-country') ?? '').slice(0, 2).toUpperCase(),
    device: deviceOf(ua),
  }
  after(() => recordPageView(view))
  return new Response(null, { status: 204 })
}

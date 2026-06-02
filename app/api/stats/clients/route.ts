import { ok, fail, authed } from '@/lib/api'
import { buildStats, parseStatsFilter } from '@/lib/stats'

export async function GET(request: Request) {
  const { user, res } = await authed()
  if (res) return res

  const parsed = parseStatsFilter(new URL(request.url).searchParams)
  if ('error' in parsed) return fail(parsed.error)

  const stats = await buildStats(user.id, parsed.filter)
  return ok({ range: stats.range, clients: stats.clients })
}

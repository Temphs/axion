import { ok, fail } from '@/lib/api'
import { adminApi } from '@/lib/admin/auth'
import { findFix } from '@/lib/admin/fixes'
import { recordError } from '@/lib/monitoring/record'

// Runs one whitelisted fix. The id only selects from the fixed list in
// lib/admin/fixes.ts; nothing from the request reaches the database.
export async function POST(request: Request, ctx: RouteContext<'/api/admin/fixes/[id]'>) {
  const { res } = await adminApi(request)
  if (res) return res

  const { id } = await ctx.params
  const fix = findFix(id)
  if (!fix) return fail('Unknown fix', 404)

  try {
    const message = await fix.run()
    return ok({ ok: true, message })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await recordError({ source: 'server', kind: 'job', route: `/api/admin/fixes/${id}`, message: `Fix "${id}" failed: ${message}` })
    return fail(`The fix failed: ${message.slice(0, 300)}`, 500)
  }
}

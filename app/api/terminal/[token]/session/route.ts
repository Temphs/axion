import { fail, ok } from '@/lib/api'
import { loadTerminalData, parseDayParam, resolveTerminal } from '@/lib/terminal'

// Everything one terminal screen needs, for one day. The employee's link is the
// credential, so an unknown or revoked token is simply "not found".
export async function GET(request: Request, ctx: RouteContext<'/api/terminal/[token]/session'>) {
  const { token } = await ctx.params
  const session = await resolveTerminal(token)
  if (!session) return fail('Ο σύνδεσμος δεν ισχύει', 404)

  const day = parseDayParam(new URL(request.url).searchParams.get('date'))
  return ok(await loadTerminalData(session, day))
}

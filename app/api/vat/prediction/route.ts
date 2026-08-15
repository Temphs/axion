import { ok, fail, authed } from '@/lib/api'
import { predictionQuerySchema, parseSearchParams } from '@/services/vat/schemas'
import { getVatPrediction } from '@/services/vat/queries'

export async function GET(request: Request) {
  const { user, res } = await authed()
  if (res) return res

  const parsed = parseSearchParams(predictionQuerySchema, new URL(request.url).searchParams)
  if ('error' in parsed) return fail(parsed.error)

  return ok(await getVatPrediction(user.id, parsed.basis))
}

import { destroySession } from '@/lib/auth'
import { ok } from '@/lib/api'

export async function POST() {
  await destroySession()
  return ok({ ok: true })
}

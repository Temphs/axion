import { getCurrentUser } from '@/lib/auth'
import { ok, fail } from '@/lib/api'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return fail('Unauthorized', 401)
  return ok({ user })
}

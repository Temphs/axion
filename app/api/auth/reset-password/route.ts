import { after } from 'next/server'
import { ok, fail, readJson } from '@/lib/api'
import { track } from '@/lib/monitoring/record'
import { passwordProblem } from '@/lib/auth'
import { clientIp, rateLimit, tooManyRequests } from '@/lib/rateLimit'
import { resetPassword } from '@/lib/passwordReset'

export async function POST(request: Request) {
  const limited = rateLimit(`reset-ip:${clientIp(request)}`, 10, 15 * 60_000)
  if (!limited.ok) return tooManyRequests(limited.retryAfterSeconds)

  const body = await readJson<{ token?: string; password?: string }>(request)
  if (!body) return fail('Invalid JSON body')

  const token = body.token?.toString().trim()
  if (!token || token.length > 128) return fail('This reset link is invalid or has expired', 400)
  const problem = passwordProblem(body.password)
  if (problem) return fail(problem)

  const result = await resetPassword(token, body.password as string)
  if (!result.ok) return fail('This reset link is invalid or has expired', 400)
  after(() => track('password_reset_completed'))
  return ok({ reset: true })
}

import type { Instrumentation } from 'next'

// Server errors (pages, route handlers, server actions, proxy) are recorded in
// the admin console's error log. Database code is only loaded in the Node.js
// runtime; redirects and notFound() are control flow, not errors.
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  const { isFrameworkSignal } = await import('@/lib/monitoring/scrub')
  if (isFrameworkSignal(err)) return

  const { recordError, userIdFromCookieHeader } = await import('@/lib/monitoring/record')
  const error = err instanceof Error ? err : new Error(String(err))
  await recordError({
    source: 'server',
    kind: context.routeType,
    route: request.path,
    message: error.message,
    stack: error.stack ?? null,
    userId: await userIdFromCookieHeader(request.headers.cookie),
  })
}

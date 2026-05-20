import { NextResponse, type NextRequest } from 'next/server'
import { defaultLocale, locales } from '@/lib/i18n'

function getLocale(request: NextRequest): string {
  const header = request.headers.get('accept-language')
  if (header) {
    const requested = header
      .split(',')
      .map((part) => part.split(';')[0].trim().toLowerCase().split('-')[0])
    for (const lang of requested) {
      if ((locales as readonly string[]).includes(lang)) return lang
    }
  }
  return defaultLocale
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const pathnameHasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  )
  if (pathnameHasLocale) return

  const locale = getLocale(request)
  request.nextUrl.pathname = `/${locale}${pathname}`
  return NextResponse.redirect(request.nextUrl)
}

export const config = {
  // Run on all paths except Next internals and files with an extension.
  matcher: ['/((?!_next|favicon.ico|.*\\..*).*)'],
}

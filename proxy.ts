import { NextResponse, type NextRequest } from 'next/server'
import { defaultLocale, locales } from '@/lib/i18n'
import { isModuleEnabled, type ModuleId } from '@/lib/modules'

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

// Which module owns a path, for the ones that can be switched off. Everything
// else belongs to MyEmployee, which is always enabled.
function gatedModuleFor(pathname: string): ModuleId | null {
  if (/^\/api\/vat(\/|$)/.test(pathname)) return 'vat'
  if (/^\/[^/]+\/dashboard\/vat(\/|$)/.test(pathname)) return 'vat'
  if (/^\/[^/]+\/dashboard\/mycfo(\/|$)/.test(pathname)) return 'mycfo'
  return null
}

// The employee terminal carries its whole credential in the URL (/t/<token>),
// which is what makes it openable from a text message with no password. Two
// headers keep that token from travelling further than the phone it was sent
// to: no Referer on outbound navigations, and no indexing if a link ever ends
// up somewhere a crawler can reach it.
function isTerminalPath(pathname: string): boolean {
  return /^\/[^/]+\/t\/[^/]+/.test(pathname) || pathname.startsWith('/api/terminal/')
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Disabled modules are refused here rather than in the page. A page with a
  // loading.tsx starts streaming a 200 before its own notFound() runs, so the
  // page guard alone still served the skeleton of a module this deployment
  // doesn't run; only a check ahead of rendering can answer a real 404.
  const gated = gatedModuleFor(pathname)
  if (gated && !isModuleEnabled(gated)) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.rewrite(new URL('/_not-found', request.url), { status: 404 })
  }

  if (isTerminalPath(pathname)) {
    const res = NextResponse.next()
    res.headers.set('Referrer-Policy', 'no-referrer')
    res.headers.set('X-Robots-Tag', 'noindex, nofollow')
    return res
  }

  // Only page paths get the locale prefix. An API route matched for one of the
  // checks above must fall through untouched — redirecting /api/terminal/… to
  // /el/api/terminal/… would break every request the terminal makes.
  if (pathname.startsWith('/api/')) return

  const pathnameHasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  )
  if (pathnameHasLocale) return

  const locale = getLocale(request)
  request.nextUrl.pathname = `/${locale}${pathname}`
  return NextResponse.redirect(request.nextUrl)
}

export const config = {
  // All paths except Next internals and files with an extension. API routes are
  // skipped for the locale redirect but /api/vat still needs the module gate,
  // so it is matched explicitly.
  matcher: ['/((?!api|_next|favicon.ico|.*\\..*).*)', '/api/vat/:path*', '/api/terminal/:path*'],
}

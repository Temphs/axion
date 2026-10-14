import { describe, expect, it } from 'vitest'
import {
  deviceOf,
  errorFingerprint,
  isBot,
  isFrameworkSignal,
  normalizePath,
  referrerHost,
  scrubText,
  topFrame,
} from '@/lib/monitoring/scrub'

describe('normalizePath', () => {
  it('drops query strings and fragments (reset tokens live there)', () => {
    expect(normalizePath('/el/reset-password?token=abcdef123456')).toBe('/el/reset-password')
    expect(normalizePath('https://axion.example/en/login#x')).toBe('/en/login')
  })

  it('replaces entry-link tokens, which are credentials', () => {
    expect(normalizePath('/el/t/DQCwm_uza5iGd-IYRtaV9pyv')).toBe('/el/t/[token]')
    expect(normalizePath('/api/terminal/DQCwm_uza5iGd-IYRtaV9pyv/entries')).toBe('/api/terminal/[token]/entries')
  })

  it('folds record ids so one page is one row', () => {
    expect(normalizePath('/el/dashboard/employees/cmv5pz6ia01cbpi7d798bmkw2')).toBe('/el/dashboard/employees/[id]')
    expect(normalizePath('/el/dashboard/clients/board')).toBe('/el/dashboard/clients/board')
  })

  it('survives junk', () => {
    expect(normalizePath(undefined)).toBe('/')
    expect(normalizePath(42)).toBe('/')
    expect(normalizePath('https://')).toBe('/')
  })
})

describe('scrubText', () => {
  it('removes emails, secrets and tokens', () => {
    const out = scrubText(
      'User maria@example.gr failed: Bearer axion_sk_0123456789abcdef password=hunter2 at /el/t/DQCwm_uza5iGd-IYRtaV9pyv',
      1000
    )
    expect(out).not.toMatch(/maria@example\.gr|hunter2|axion_sk_0123|DQCwm/)
    expect(out).toContain('[email]')
    expect(out).toContain('/t/[token]')
  })

  it('caps length', () => {
    expect(scrubText('word '.repeat(10), 12)).toBe('word word wo…')
  })
})

describe('errorFingerprint', () => {
  const base = { source: 'server', kind: 'route', route: '/api/entries', message: 'Unknown employee 123', stack: null }

  it('groups the same error with different numbers', () => {
    expect(errorFingerprint(base)).toBe(errorFingerprint({ ...base, message: 'Unknown employee 456' }))
  })

  it('separates different routes and sources', () => {
    expect(errorFingerprint(base)).not.toBe(errorFingerprint({ ...base, route: '/api/clients' }))
    expect(errorFingerprint(base)).not.toBe(errorFingerprint({ ...base, source: 'client' }))
  })

  it('ignores line numbers in the stack, so redeploys still group', () => {
    const a = 'Error: x\n    at handler (/var/task/app/api/x/route.js:10:5)'
    const b = 'Error: x\n    at handler (/var/task/app/api/x/route.js:99:1)'
    expect(topFrame(a)).toBe(topFrame(b))
    expect(errorFingerprint({ ...base, stack: a })).toBe(errorFingerprint({ ...base, stack: b }))
  })
})

describe('visitor classification', () => {
  it('treats crawlers, scripts and missing user agents as bots', () => {
    expect(isBot('Mozilla/5.0 (compatible; Googlebot/2.1)')).toBe(true)
    expect(isBot('curl/8.0')).toBe(true)
    expect(isBot(null)).toBe(true)
    expect(isBot('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1')).toBe(false)
  })

  it('tells phones from desktops', () => {
    expect(deviceOf('Mozilla/5.0 (Linux; Android 14) Mobile Safari')).toBe('mobile')
    expect(deviceOf('Mozilla/5.0 (Windows NT 10.0) Chrome/120')).toBe('desktop')
  })

  it('keeps only external referrer hosts', () => {
    expect(referrerHost('https://www.google.com/search?q=axion', 'axion.example')).toBe('google.com')
    expect(referrerHost('https://axion.example/en', 'axion.example')).toBe('')
    expect(referrerHost('not a url', 'axion.example')).toBe('')
  })
})

describe('isFrameworkSignal', () => {
  it('does not log redirects and notFound as errors', () => {
    expect(isFrameworkSignal(Object.assign(new Error('NEXT_REDIRECT'), { digest: 'NEXT_REDIRECT;replace;/el/login;307;' }))).toBe(true)
    expect(isFrameworkSignal(Object.assign(new Error('x'), { digest: 'NEXT_HTTP_ERROR_FALLBACK;404' }))).toBe(true)
    expect(isFrameworkSignal(new Error('no such column: accessToken'))).toBe(false)
  })
})

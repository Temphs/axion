import { describe, it, expect } from 'vitest'
import {
  EDIT_WINDOW_DAYS,
  generateAccessToken,
  isWithinEditWindow,
  isoDate,
  parseDayParam,
  terminalText,
} from '@/lib/terminal'

describe('terminal access token', () => {
  it('is URL-safe and long enough to be unguessable', () => {
    const token = generateAccessToken()
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/) // survives being pasted into a URL
    expect(token.length).toBeGreaterThanOrEqual(24) // 144 bits of entropy
  })

  it('never repeats', () => {
    const tokens = new Set(Array.from({ length: 500 }, () => generateAccessToken()))
    expect(tokens.size).toBe(500)
  })
})

describe('correction window', () => {
  const now = new Date(Date.UTC(2026, 7, 17, 10, 0, 0))

  it('allows today and the days just behind it', () => {
    expect(isWithinEditWindow(new Date(Date.UTC(2026, 7, 17)), now)).toBe(true)
    expect(isWithinEditWindow(new Date(Date.UTC(2026, 7, 14)), now)).toBe(true)
  })

  it('refuses anything older than the window', () => {
    const tooOld = new Date(now.getTime() - (EDIT_WINDOW_DAYS + 1) * 86_400_000)
    expect(isWithinEditWindow(tooOld, now)).toBe(false)
    expect(isWithinEditWindow(new Date(Date.UTC(2026, 6, 1)), now)).toBe(false)
  })

  it('refuses dates in the future beyond today', () => {
    expect(isWithinEditWindow(new Date(Date.UTC(2026, 7, 20)), now)).toBe(false)
  })

  it('still accepts today when the clock is late in the day', () => {
    // Entries are stored at UTC midnight, so "today" must stay valid at 23:59.
    const lateEvening = new Date(Date.UTC(2026, 7, 17, 23, 59, 59))
    expect(isWithinEditWindow(new Date(Date.UTC(2026, 7, 17)), lateEvening)).toBe(true)
  })
})

describe('day parsing', () => {
  // 22:30 UTC on 17 Aug is 01:30 on 18 Aug in Athens (UTC+3 in summer).
  const now = new Date(Date.UTC(2026, 7, 17, 22, 30))

  it('reads a YYYY-MM-DD parameter as a UTC day', () => {
    expect(isoDate(parseDayParam('2026-08-03', now))).toBe('2026-08-03')
  })

  it('falls back to today in Greece, not in UTC, when the parameter is missing or malformed', () => {
    // At 01:30 in Athens the screen must open on the 18th, the date the phone shows.
    expect(isoDate(parseDayParam(null, now))).toBe('2026-08-18')
    expect(isoDate(parseDayParam('χθες', now))).toBe('2026-08-18')
    expect(isoDate(parseDayParam('2026-13-45', now))).toBe('2026-08-18')
    expect(isoDate(parseDayParam('2026-02-31', now))).toBe('2026-08-18') // no silent roll-over to March
  })
})

describe('correction window in Greek days', () => {
  it('accepts the Greek "today" just after midnight, before UTC has caught up', () => {
    const justAfterMidnightAthens = new Date(Date.UTC(2026, 7, 17, 21, 30)) // 00:30 on 18 Aug in Athens
    expect(isWithinEditWindow(new Date(Date.UTC(2026, 7, 18)), justAfterMidnightAthens)).toBe(true)
    expect(isWithinEditWindow(new Date(Date.UTC(2026, 7, 19)), justAfterMidnightAthens)).toBe(false)
  })
})

describe('terminal free text', () => {
  it('trims, empties to null, and refuses over-long text', () => {
    expect(terminalText('  Λογιστική  ', 120)).toBe('Λογιστική')
    expect(terminalText('   ', 120)).toBeNull()
    expect(terminalText(undefined, 120)).toBeNull()
    expect(terminalText(42, 120)).toBe('42') // non-strings no longer crash the request
    expect(terminalText('x'.repeat(121), 120)).toBeUndefined()
  })
})

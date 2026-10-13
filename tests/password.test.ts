import { describe, expect, it } from 'vitest'
import { randomBytes, scryptSync } from 'node:crypto'
import { hashPassword, verifyPassword } from '@/lib/password'

const composed = 'Καλημέρα2026'.normalize('NFC') // "έ" as one code point (Windows, Android)
const decomposed = 'Καλημέρα2026'.normalize('NFD') // "ε" + combining accent (macOS, iOS)

// A hash made the old way: scrypt over the raw bytes the device sent.
function legacyHash(password: string): string {
  const salt = randomBytes(16).toString('hex')
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`
}

describe('password hashing', () => {
  it('accepts the right password and rejects a wrong one', async () => {
    const stored = await hashPassword('Summer2026!')
    expect(await verifyPassword('Summer2026!', stored)).toBe(true)
    expect(await verifyPassword('summer2026!', stored)).toBe(false)
    expect(await verifyPassword('', stored)).toBe(false)
  })

  it('accepts a Greek password whichever way the device encodes accents', async () => {
    expect(composed).not.toBe(decomposed) // different bytes, same visible text
    const fromWindows = await hashPassword(composed)
    const fromMac = await hashPassword(decomposed)
    expect(await verifyPassword(decomposed, fromWindows)).toBe(true)
    expect(await verifyPassword(composed, fromMac)).toBe(true)
  })

  it('still accepts passwords hashed before normalisation, from either device', async () => {
    expect(await verifyPassword(decomposed, legacyHash(decomposed))).toBe(true)
    expect(await verifyPassword(composed, legacyHash(decomposed))).toBe(true)
    expect(await verifyPassword(decomposed, legacyHash(composed))).toBe(true)
    expect(await verifyPassword('Summer2026!', legacyHash('Summer2026!'))).toBe(true)
  })

  it('rejects malformed stored hashes', async () => {
    expect(await verifyPassword('x', 'not-a-hash')).toBe(false)
    expect(await verifyPassword('x', 'abcd:1234')).toBe(false)
  })
})

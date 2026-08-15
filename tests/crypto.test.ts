import { describe, it, expect, beforeAll } from 'vitest'
import { encryptSecret, decryptSecret, maskSecret } from '@/lib/crypto'

beforeAll(() => {
  process.env.AXION_ENCRYPTION_KEY = 'test-only-key-please-rotate-0123456789'
})

describe('secret encryption', () => {
  it('round-trips a secret', () => {
    const cipher = encryptSecret('my-subscription-key')
    expect(cipher).not.toContain('my-subscription-key')
    expect(decryptSecret(cipher)).toBe('my-subscription-key')
  })

  it('produces a different ciphertext per call (random IV)', () => {
    expect(encryptSecret('same')).not.toBe(encryptSecret('same'))
  })

  it('rejects tampered ciphertext', () => {
    const cipher = encryptSecret('secret')
    const parts = cipher.split('.')
    const corrupted = Buffer.from(parts[3], 'base64')
    corrupted[0] ^= 0xff
    parts[3] = corrupted.toString('base64')
    expect(() => decryptSecret(parts.join('.'))).toThrow()
  })

  it('rejects unknown formats', () => {
    expect(() => decryptSecret('not-a-cipher')).toThrow('Unrecognized ciphertext format')
  })
})

describe('maskSecret', () => {
  it('never reveals more than a short prefix', () => {
    expect(maskSecret('abcdef123456')).toMatch(/^abc•+$/)
    expect(maskSecret('ab')).toBe('•••')
  })
})

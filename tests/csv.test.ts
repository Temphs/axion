import { describe, expect, it } from 'vitest'
import { csvCell } from '@/components/workforce/csv'

describe('csvCell', () => {
  it('neutralises text a spreadsheet would run as a formula', () => {
    expect(csvCell('=HYPERLINK("http://x","y")')).toBe(`"'=HYPERLINK(""http://x"",""y"")"`)
    expect(csvCell('+30 210 000')).toBe("'+30 210 000")
    expect(csvCell('-1+2')).toBe("'-1+2")
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)")
  })

  it('leaves ordinary text and numbers alone', () => {
    expect(csvCell('Μαρία Παπαδάκη')).toBe('Μαρία Παπαδάκη')
    expect(csvCell(-271.456)).toBe('-271.46')
    expect(csvCell(null)).toBe('')
  })

  it('quotes separators and quotes', () => {
    expect(csvCell('A; B')).toBe('"A; B"')
    expect(csvCell('say "hi"')).toBe('"say ""hi"""')
  })
})

// Client-side CSV export, aimed at Excel in a Greek locale: a UTF-8 BOM so the
// Greek text isn't mojibake, and a semicolon delimiter because that locale's
// list separator is `;` — a comma-delimited file opens as one squashed column,
// which is where these exports were landing.
const DELIMITER = ';'

export function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number | null>>): void {
  const escape = (value: string | number | null): string => {
    if (value === null || value === undefined) return ''
    // Decimals use a comma too, so numbers are localized rather than left with
    // a dot Excel would read as text.
    const s = typeof value === 'number' ? String(Math.round(value * 100) / 100).replace('.', ',') : value
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [headers.map(escape).join(DELIMITER), ...rows.map((r) => r.map(escape).join(DELIMITER))]
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// Client-side CSV export. Values are quoted, semicolon-safe, UTF-8 BOM so
// Excel (Greek locale included) opens the file correctly.
export function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number | null>>): void {
  const escape = (value: string | number | null): string => {
    if (value === null || value === undefined) return ''
    const s = typeof value === 'number' ? String(Math.round(value * 100) / 100) : value
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))]
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

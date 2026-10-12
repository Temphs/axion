// Client-side CSV export. Values are quoted, semicolon-safe, UTF-8 BOM so
// Excel (Greek locale included) opens the file correctly. Text that a
// spreadsheet would run as a formula (=, +, -, @, tab, CR at the start) is
// prefixed with an apostrophe: names arrive through the API and must not
// execute when a manager opens the export.
export function csvCell(value: string | number | null): string {
  if (value === null || value === undefined) return ''
  const s =
    typeof value === 'number'
      ? String(Math.round(value * 100) / 100)
      : /^[=+\-@\t\r]/.test(value)
        ? `'${value}`
        : value
  return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number | null>>): void {
  const lines = [headers.map(csvCell).join(','), ...rows.map((r) => r.map(csvCell).join(','))]
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

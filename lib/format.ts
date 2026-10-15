const eurFmt = new Intl.NumberFormat('el-GR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})
const eurFmt2 = new Intl.NumberFormat('el-GR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const numFmt = new Intl.NumberFormat('el-GR', { maximumFractionDigits: 1 })

export function eur(value: number, decimals = false): string {
  return (decimals ? eurFmt2 : eurFmt).format(value)
}

export function hrs(value: number): string {
  return `${numFmt.format(value)} ώ`
}

export function num(value: number): string {
  return numFmt.format(value)
}

export function pct(fraction: number | null): string {
  if (fraction === null) return '—'
  return `${numFmt.format(fraction * 100)}%`
}

// A stored calendar day (entries are kept at UTC midnight). The zone is fixed
// so server and browser render the same text (otherwise: hydration error).
export function shortDate(value: string | Date): string {
  return new Intl.DateTimeFormat('el-GR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(value)
  )
}

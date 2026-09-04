'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutGrid,
  Users,
  Briefcase,
  Table2,
  Clock,
  KeyRound,
  Settings,
  Users2,
  BarChart3,
  Landmark,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/* ── Product modules ──────────────────────────────────────────── */
const PRODUCTS = [
  { id: 'myemployee', label: 'MyEmployee', icon: Users2 },
  { id: 'vat',        label: 'VAT Analysis', icon: BarChart3 },
  { id: 'mycfo',      label: 'MyCFO', icon: Landmark },
]

/* ── MyEmployee sub-nav ───────────────────────────────────────── */
const EMP_NAV = [
  { seg: '',              label: 'Επισκόπηση',      icon: LayoutGrid },
  { seg: 'employees',     label: 'Εργαζόμενοι',     icon: Users },
  { seg: 'clients',       label: 'Πελάτες',          icon: Briefcase },
  { seg: 'clients/board', label: 'Πίνακας πελατών', icon: Table2 },
  { seg: 'entries',       label: 'Καταχωρήσεις',    icon: Clock },
  { seg: 'api-keys',      label: 'API Keys',         icon: KeyRound },
  { seg: 'settings',      label: 'Ρυθμίσεις',       icon: Settings },
]

export function Nav({
  lang,
  orientation = 'vertical',
}: {
  lang: string
  orientation?: 'vertical' | 'horizontal'
}) {
  const pathname = usePathname()
  const base = `/${lang}/dashboard`
  const h = orientation === 'horizontal'

  const isVat  = pathname.startsWith(`${base}/vat`)
  const isCfo  = pathname.startsWith(`${base}/mycfo`)
  const isEmp  = !isVat && !isCfo

  // Length of the most specific sub-nav href matching the current path.
  const longestMatch = EMP_NAV.reduce((longest, { seg }) => {
    if (!seg) return longest
    const href = `${base}/${seg}`
    return pathname.startsWith(href) && href.length > longest ? href.length : longest
  }, 0)

  // Each entry carries a small rounded icon tile. The selected one lifts off the
  // white panel as its own card and fills its tile with the brand gradient.
  const activeLinkCls  = 'bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.06),0_10px_24px_-12px_rgba(37,99,235,0.45)]'
  const passiveLinkCls = 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
  const tileCls = (active: boolean) =>
    cn(
      'flex shrink-0 items-center justify-center rounded-lg transition',
      active
        ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-[0_3px_8px_-2px_rgba(37,99,235,0.55)]'
        : 'bg-white text-slate-400 shadow-[0_1px_3px_rgba(15,23,42,0.1)]'
    )

  return (
    <div className={cn('flex gap-1', h ? 'flex-col' : 'flex-col')}>

      {/* ── Product selector ──────────────────────────────────── */}
      <nav className={cn('flex gap-1', h ? 'flex-row overflow-x-auto' : 'flex-col')}>
        {PRODUCTS.map(({ id, label, icon: Icon }) => {
          const href   = id === 'vat' ? `${base}/vat` : id === 'mycfo' ? `${base}/mycfo` : base
          const active = id === 'vat' ? isVat : id === 'mycfo' ? isCfo : isEmp
          return (
            <Link
              key={id}
              href={href}
              className={cn(
                'flex items-center gap-2.5 rounded-xl p-2 pr-3.5 text-sm font-semibold transition',
                h && 'whitespace-nowrap',
                active ? activeLinkCls : passiveLinkCls,
              )}
            >
              <span className={cn(tileCls(active), 'h-8 w-8')}>
                <Icon size={16} strokeWidth={2} />
              </span>
              {label}
            </Link>
          )
        })}
      </nav>

      {/* ── MyEmployee sub-nav ────────────────────────────────── */}
      {isEmp && (
        <nav
          className={cn(
            'flex gap-1',
            h
              ? 'flex-row overflow-x-auto border-t border-slate-100 pt-2 mt-1'
              : 'flex-col mt-3 border-t border-slate-100 pt-3',
          )}
        >
          {!h && (
            <span className="mb-1 px-3.5 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Εργαλεία
            </span>
          )}
          {EMP_NAV.map(({ seg, label, icon: Icon }) => {
            const href   = seg ? `${base}/${seg}` : base
            // Longest matching entry wins, so /clients/board highlights itself
            // rather than also lighting up /clients.
            const active = seg ? pathname.startsWith(href) && href.length === longestMatch : pathname === base
            return (
              <Link
                key={seg || 'overview'}
                href={href}
                className={cn(
                  'flex items-center gap-2.5 rounded-xl p-1.5 pr-3.5 text-sm font-medium transition',
                  h && 'whitespace-nowrap',
                  active ? activeLinkCls : passiveLinkCls,
                )}
              >
                <span className={cn(tileCls(active), 'h-7 w-7')}>
                  <Icon size={14} strokeWidth={2} />
                </span>
                {label}
              </Link>
            )
          })}
        </nav>
      )}
    </div>
  )
}

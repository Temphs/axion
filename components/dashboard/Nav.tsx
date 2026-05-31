'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutGrid,
  Users,
  Briefcase,
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
  { seg: '',          label: 'Επισκόπηση',    icon: LayoutGrid },
  { seg: 'employees', label: 'Εργαζόμενοι',   icon: Users },
  { seg: 'clients',   label: 'Πελάτες',        icon: Briefcase },
  { seg: 'entries',   label: 'Καταχωρήσεις',  icon: Clock },
  { seg: 'api-keys',  label: 'API Keys',       icon: KeyRound },
  { seg: 'settings',  label: 'Ρυθμίσεις',     icon: Settings },
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

  const activeLinkCls  = 'bg-white/[0.92] text-blue-700 shadow-sm'
  const passiveLinkCls = 'text-blue-100/70 hover:bg-white/10 hover:text-white'

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
                'flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition',
                h && 'whitespace-nowrap',
                active ? activeLinkCls : passiveLinkCls,
              )}
            >
              <Icon size={16} strokeWidth={2} />
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
              ? 'flex-row overflow-x-auto border-t border-white/10 pt-2 mt-1'
              : 'flex-col mt-3 border-t border-white/10 pt-3',
          )}
        >
          {!h && (
            <span className="mb-1 px-3.5 text-[9px] font-bold uppercase tracking-[0.18em] text-blue-200/40">
              Εργαλεία
            </span>
          )}
          {EMP_NAV.map(({ seg, label, icon: Icon }) => {
            const href   = seg ? `${base}/${seg}` : base
            const active = seg ? pathname.startsWith(href) : pathname === base
            return (
              <Link
                key={seg || 'overview'}
                href={href}
                className={cn(
                  'flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-sm font-medium transition',
                  h && 'whitespace-nowrap',
                  active ? activeLinkCls : passiveLinkCls,
                )}
              >
                <Icon size={15} strokeWidth={2} />
                {label}
              </Link>
            )
          })}
        </nav>
      )}
    </div>
  )
}

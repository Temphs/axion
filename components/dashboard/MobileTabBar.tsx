'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  Briefcase,
  Clock,
  KeyRound,
  Landmark,
  LayoutGrid,
  Menu,
  Settings,
  ShieldCheck,
  Table2,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { BottomSheet } from './BottomSheet'
import { LogoutButton } from './LogoutButton'

// Phone navigation: the four MyEmployee screens people use daily as a fixed
// bottom tab bar (thumb reach, always visible), and everything else in a
// "More" sheet. Replaces the sideways-scrolling nav rows on small screens.

const TABS = [
  { seg: '', label: 'Επισκόπηση', icon: LayoutGrid },
  { seg: 'employees', label: 'Εργαζόμενοι', icon: Users },
  { seg: 'clients', label: 'Πελάτες', icon: Briefcase },
  { seg: 'entries', label: 'Ώρες', icon: Clock },
] as const

const MORE = [
  { seg: 'clients/board', label: 'Πίνακας πελατών', icon: Table2 },
  { seg: 'api-keys', label: 'API Keys', icon: KeyRound },
  { seg: 'settings', label: 'Ρυθμίσεις', icon: Settings },
  { seg: 'vat', label: 'VAT Analysis', icon: BarChart3 },
  { seg: 'mycfo', label: 'MyCFO', icon: Landmark },
] as const

export function MobileTabBar({ lang, admin, name, email }: { lang: string; admin: boolean; name: string; email: string }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const base = `/${lang}/dashboard`
  const href = (seg: string) => (seg ? `${base}/${seg}` : base)

  const close = () => setOpen(false)

  // Close the sheet whenever the page changes.
  const [lastPath, setLastPath] = useState(pathname)
  if (pathname !== lastPath) {
    setLastPath(pathname)
    setOpen(false)
  }

  // /clients/board belongs to "More", not to the Clients tab.
  const tabActive = (seg: string) =>
    seg === ''
      ? pathname === base
      : pathname.startsWith(href(seg)) && !(seg === 'clients' && pathname.startsWith(href('clients/board')))
  const moreActive = !TABS.some((t) => tabActive(t.seg))

  return (
    <>
      <nav
        aria-label="Κύρια πλοήγηση"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.25)] backdrop-blur-md lg:hidden"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {TABS.map(({ seg, label, icon: Icon }) => {
            const active = tabActive(seg)
            return (
              <Link
                key={seg || 'overview'}
                href={href(seg)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-[58px] flex-col items-center justify-center gap-1 text-[11px] font-medium transition',
                  active ? 'text-blue-600' : 'text-slate-500 active:bg-slate-50'
                )}
              >
                <Icon size={21} strokeWidth={active ? 2.4 : 2} />
                {label}
              </Link>
            )
          })}
          <button
            onClick={() => setOpen(true)}
            aria-expanded={open}
            className={cn(
              'flex min-h-[58px] flex-col items-center justify-center gap-1 text-[11px] font-medium transition',
              moreActive ? 'text-blue-600' : 'text-slate-500 active:bg-slate-50'
            )}
          >
            <Menu size={21} strokeWidth={moreActive ? 2.4 : 2} />
            Περισσότερα
          </button>
        </div>
      </nav>

      <BottomSheet open={open} onClose={close} title={name} label="Περισσότερα" subtitle={email}>
        <ul className="grid grid-cols-2 gap-2">
          {MORE.map(({ seg, label, icon: Icon }) => {
            const active = pathname.startsWith(href(seg))
            return (
              <li key={seg}>
                <Link
                  href={href(seg)}
                  className={cn(
                    'flex min-h-[52px] items-center gap-3 rounded-2xl px-3.5 text-sm font-medium',
                    active ? 'bg-blue-50 text-blue-700' : 'bg-slate-50 text-slate-700 active:bg-slate-100'
                  )}
                >
                  <Icon size={18} className="shrink-0" />
                  {label}
                </Link>
              </li>
            )
          })}
          {admin && (
            <li>
              <Link
                href={`/${lang}/admin`}
                className="flex min-h-[52px] items-center gap-3 rounded-2xl bg-slate-50 px-3.5 text-sm font-medium text-slate-700 active:bg-slate-100"
              >
                <ShieldCheck size={18} className="shrink-0" />
                Admin console
              </Link>
            </li>
          )}
        </ul>
        <div className="mt-3 border-t border-slate-100 pt-2">
          <LogoutButton />
        </div>
      </BottomSheet>
    </>
  )
}

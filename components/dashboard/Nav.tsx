'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, Users, Briefcase, Clock, KeyRound, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
  { seg: '', label: 'Επισκόπηση', icon: LayoutGrid },
  { seg: 'employees', label: 'Εργαζόμενοι', icon: Users },
  { seg: 'clients', label: 'Πελάτες', icon: Briefcase },
  { seg: 'entries', label: 'Καταχωρήσεις', icon: Clock },
  { seg: 'api-keys', label: 'API Keys', icon: KeyRound },
  { seg: 'settings', label: 'Ρυθμίσεις', icon: Settings },
]

export function Nav({ lang, orientation = 'vertical' }: { lang: string; orientation?: 'vertical' | 'horizontal' }) {
  const pathname = usePathname()
  const base = `/${lang}/dashboard`
  const horizontal = orientation === 'horizontal'

  return (
    <nav className={cn('flex gap-1', horizontal ? 'flex-row overflow-x-auto' : 'flex-col')}>
      {items.map(({ seg, label, icon: Icon }) => {
        const href = seg ? `${base}/${seg}` : base
        const active = seg ? pathname.startsWith(href) : pathname === base
        return (
          <Link
            key={seg || 'overview'}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition',
              horizontal && 'whitespace-nowrap',
              active ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            )}
          >
            <Icon size={18} strokeWidth={2} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { Logo } from './Logo'
import { Button } from './ui'
import { LanguageSwitcher } from './LanguageSwitcher'
import { useI18n } from './i18n'
import { cn } from '@/lib/utils'

const linkHrefs = ['#features', '#benefits', '#cta', '#contact']

export function Nav() {
  const { dict } = useI18n()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  const links = dict.nav.links.map((label, i) => ({ label, href: linkHrefs[i] }))

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div
        className={cn(
          'mx-auto flex h-16 max-w-6xl items-center justify-between px-4 transition-all duration-300 sm:px-6',
          scrolled &&
            'mt-2 max-w-5xl rounded-2xl border border-slate-200/70 bg-white/80 px-4 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.15)] backdrop-blur-xl sm:px-5'
        )}
      >
        <a href="#top" aria-label={dict.nav.home} className="shrink-0">
          <Logo />
        </a>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <LanguageSwitcher />
          <Button href="#contact" variant="ghost" size="sm">
            {dict.nav.signIn}
          </Button>
          <Button href="#cta" size="sm">
            {dict.nav.bookDemo}
          </Button>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <LanguageSwitcher />
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100"
            onClick={() => setOpen((v) => !v)}
            aria-label={dict.nav.toggleMenu}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="mx-4 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-xl backdrop-blur-xl md:hidden"
          >
            {links.map((l) => (
              <a
                key={l.label}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                {l.label}
              </a>
            ))}
            <div className="p-2">
              <Button href="#cta" className="w-full" onClick={() => setOpen(false)}>
                {dict.nav.bookDemo}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

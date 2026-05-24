'use client'

import { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Button } from './ui'
import { useI18n } from './i18n'

export function StickyCta() {
  const { dict } = useI18n()
  const [show, setShow] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      const lead = document.getElementById('lead')
      const leadVisible = lead ? lead.getBoundingClientRect().top < window.innerHeight : false
      setShow(window.scrollY > 600 && !leadVisible)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return (
    <div
      aria-hidden={!show}
      className={`fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/90 px-4 pt-3 backdrop-blur-xl transition-transform duration-300 md:hidden ${
        show ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <Button href="#lead" size="lg" className="w-full" tabIndex={show ? 0 : -1}>
        {dict.stickyCta}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  )
}

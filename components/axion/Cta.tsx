'use client'

import { motion } from 'framer-motion'
import { ArrowRight, Calendar } from 'lucide-react'
import { Button } from './ui'
import { useI18n } from './i18n'

export function Cta() {
  const { dict } = useI18n()
  const t = dict.cta

  return (
    <section id="cta" className="px-4 py-20 sm:px-6 sm:py-28">
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 px-6 py-16 text-center shadow-[0_40px_80px_-30px_rgba(37,99,235,0.6)] sm:px-12 sm:py-20">
        {/* glow + grid */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-16 -top-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-24 -right-10 h-80 w-80 rounded-full bg-indigo-300/20 blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_40%,transparent_100%)]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-blue-50 backdrop-blur">
            <Calendar className="h-3.5 w-3.5" />
            {t.badge}
          </span>
          <h2
            className="mx-auto mt-5 max-w-2xl text-balance text-3xl font-bold leading-tight tracking-tight text-white sm:text-5xl"
            style={{ fontFamily: 'var(--font-manrope), system-ui, sans-serif' }}
          >
            {t.title}
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-blue-100">
            {t.subtitle}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button href="#contact" variant="light" size="lg" className="w-full sm:w-auto">
              {t.primary}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
            <Button
              href="#contact"
              size="lg"
              className="w-full bg-white/10 text-white shadow-none ring-1 ring-inset ring-white/30 hover:bg-white/20 sm:w-auto"
            >
              {t.secondary}
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

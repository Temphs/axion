'use client'

import { motion } from 'framer-motion'
import { ArrowRight, Sparkles, Star } from 'lucide-react'
import { Button } from './ui'
import { HeroDashboard } from './HeroDashboard'

function HeroBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-blue-50/60 via-white to-white" />
      {/* grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.04)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_70%_55%_at_50%_0%,#000_55%,transparent_100%)]" />
      {/* animated blobs */}
      <motion.div
        animate={{ x: [0, 40, 0], y: [0, 24, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -left-20 -top-24 h-[28rem] w-[28rem] rounded-full bg-blue-400/25 blur-3xl"
      />
      <motion.div
        animate={{ x: [0, -50, 0], y: [0, 30, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -right-24 top-0 h-[26rem] w-[26rem] rounded-full bg-indigo-400/20 blur-3xl"
      />
      <motion.div
        animate={{ x: [0, 30, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute left-1/3 top-32 h-72 w-72 rounded-full bg-sky-300/20 blur-3xl"
      />
    </div>
  )
}

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden px-4 pb-16 pt-32 sm:px-6 sm:pt-40">
      <HeroBackground />

      <div className="mx-auto max-w-3xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50/80 px-3.5 py-1.5 text-xs font-medium text-blue-700 shadow-sm backdrop-blur"
        >
          <Sparkles className="h-3.5 w-3.5" />
          AI-powered financial intelligence · AADE / MyData ready
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="text-balance text-4xl font-bold leading-[1.05] tracking-tight text-slate-900 sm:text-6xl"
          style={{ fontFamily: 'var(--font-manrope), system-ui, sans-serif' }}
        >
          Financial Intelligence for{' '}
          <span className="bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">
            Modern Businesses
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-slate-600"
        >
          Predict VAT liabilities, analyze business performance, and track employee
          profitability in one intelligent platform.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Button href="#cta" size="lg" className="w-full sm:w-auto">
            Start Free Trial
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Button>
          <Button href="#cta" variant="secondary" size="lg" className="w-full sm:w-auto">
            Book Demo
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-500"
        >
          <span className="flex">
            {[0, 1, 2, 3, 4].map((i) => (
              <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            ))}
          </span>
          No credit card required · 14-day trial
        </motion.div>
      </div>

      <div className="mx-auto mt-16 max-w-5xl [perspective:1600px]">
        <HeroDashboard />
      </div>
    </section>
  )
}

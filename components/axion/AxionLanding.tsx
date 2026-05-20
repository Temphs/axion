'use client'

import { MotionConfig } from 'framer-motion'
import { Nav } from './Nav'
import { Hero } from './Hero'
import { Trust } from './Trust'
import { Features } from './Features'
import { HowItWorks } from './HowItWorks'
import { Benefits } from './Benefits'
import { Cta } from './Cta'
import { Footer } from './Footer'

export function AxionLanding() {
  return (
    <MotionConfig reducedMotion="user">
      <div
        className="min-h-screen w-full bg-white text-slate-900 antialiased"
        style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}
      >
        <Nav />
        <main>
          <Hero />
          <Trust />
          <Features />
          <HowItWorks />
          <Benefits />
          <Cta />
        </main>
        <Footer />
      </div>
    </MotionConfig>
  )
}

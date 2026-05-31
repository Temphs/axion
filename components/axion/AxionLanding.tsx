'use client'

import { MotionConfig } from 'framer-motion'
import { Nav } from './Nav'
import { Hero } from './Hero'
import { Trust } from './Trust'
import { Problem } from './Problem'
import { Solution } from './Solution'
import { Features } from './Features'
import { FeatureGrid } from './FeatureGrid'
import { DashboardPreview } from './DashboardPreview'
import { Audiences } from './Audiences'
import { HowItWorks } from './HowItWorks'
import { Benefits } from './Benefits'
import { Cta } from './Cta'
import { LeadForm } from './LeadForm'
import { Footer } from './Footer'
import { StickyCta } from './StickyCta'

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
          <Problem />
          <Solution />
          <Features />
          <FeatureGrid />
          <DashboardPreview />
          <Audiences />
          <HowItWorks />
          <Benefits />
          <Cta />
          <LeadForm />
        </main>
        <Footer />
        <StickyCta />
      </div>
    </MotionConfig>
  )
}

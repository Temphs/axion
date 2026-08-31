'use client'

import { MotionConfig } from 'framer-motion'
import { Nav } from './Nav'
import { Hero } from './Hero'
import { Problem } from './Problem'
import { HowItWorks } from './HowItWorks'
import { DashboardPreview } from './DashboardPreview'
import { ClientAttention } from './ClientAttention'
import { EmployeeTerminal } from './EmployeeTerminal'
import { TeamOverview } from './TeamOverview'
import { Trust } from './Trust'
import { Modules } from './Modules'
import { Cta } from './Cta'
import { LeadForm } from './LeadForm'
import { Footer } from './Footer'
import { StickyCta } from './StickyCta'

// One story, in order: what you cannot see today → how Axion closes the loop →
// what the owner's screen looks like → where to look first → why employees will
// actually use it → what the team data is (and is not) → how far the data goes
// → what is genuinely available. MyVAT and P&L appear once, near the end,
// labelled as future.
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
          <Problem />
          <HowItWorks />
          <DashboardPreview />
          <ClientAttention />
          <EmployeeTerminal />
          <TeamOverview />
          <Trust />
          <Modules />
          <Cta />
          <LeadForm />
        </main>
        <Footer />
        <StickyCta />
      </div>
    </MotionConfig>
  )
}

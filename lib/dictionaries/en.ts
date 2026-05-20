import type { Dictionary } from './el'

const en: Dictionary = {
  nav: {
    links: ['Features', 'Solutions', 'Pricing', 'Contact'],
    signIn: 'Sign in',
    bookDemo: 'Book Demo',
    home: 'Axion home',
    toggleMenu: 'Toggle menu',
  },
  hero: {
    badge: 'AI-powered financial intelligence · AADE / MyData ready',
    titleLead: 'Financial Intelligence for ',
    titleHighlight: 'Modern Businesses',
    subtitle:
      'Predict VAT liabilities, analyze business performance, and track employee profitability in one intelligent platform.',
    ctaPrimary: 'Start Free Trial',
    ctaSecondary: 'Book Demo',
    rating: 'No credit card required · 14-day trial',
  },
  heroDashboard: {
    address: 'app.axion.io / overview',
    kpiLabels: ['VAT due · Apr', 'Net profit', 'Cash runway'],
    runway: '7.2 mo',
    healthy: 'Healthy',
    forecastTitle: 'VAT forecast',
    forecastSub: 'Next 6 months · MyData',
    actual: 'Actual',
    predicted: 'Predicted',
    profitabilityShort: 'Profitability',
    avgMargin: 'Avg. margin / client',
    floatLiquidityTitle: 'Liquidity healthy',
    floatLiquiditySub: 'No risk detected',
    floatForecastTitle: 'VAT forecast +12.4%',
    floatForecastSub: 'vs. last quarter',
  },
  trust: {
    eyebrow: 'Built for accounting firms and SMEs',
    indicators: [
      { title: 'AI-powered', desc: 'Prediction models trained on real invoice activity.' },
      {
        title: 'AADE / MyData Ready',
        desc: 'Native integration with Greek e-invoicing standards.',
      },
      {
        title: 'Real-time insights',
        desc: 'Live dashboards that update as transactions post.',
      },
    ],
  },
  features: {
    eyebrow: 'Features',
    title: 'One platform for your entire financial picture',
    subtitle:
      'From VAT forecasting to employee-level profitability — Axion turns raw invoice data into decisions you can act on.',
    vat: {
      eyebrow: 'MyVAT Prediction',
      title: "Predict VAT obligations before they're due",
      desc: 'Predict future VAT obligations in real time using MyData invoice activity from AADE.',
      bullets: [
        'VAT forecasting dashboard',
        'Liquidity alerts before deadlines',
        'Upcoming liabilities at a glance',
      ],
      chips: ['SQL pipeline · MyData invoices', 'Real-time prediction engine'],
    },
    vatMockup: {
      title: 'VAT forecast',
      sub: 'Next 6 months · powered by MyData',
      alertPre: 'Liquidity dips below threshold in',
      alertDays: '23 days',
      upcoming: 'Upcoming liabilities',
      months: ['April', 'May', 'June'],
    },
    pnl: {
      eyebrow: 'P&L Analysis',
      title: 'See exactly where money is made and spent',
      desc: 'Automatically categorize invoices and monitor earnings and expenses across all businesses.',
      bullets: [
        'Monthly vs. yearly comparison',
        'Revenue & expense analytics',
        'Automatic expense categorization',
        'Live profitability metrics',
      ],
      chips: ['Revenue analytics', 'Auto-categorization'],
    },
    pnlMockup: {
      title: 'Profit & Loss',
      sub: 'This year vs. last year',
      stats: ['Revenue', 'Expenses', 'Margin'],
      cats: ['Payroll', 'Suppliers', 'Operations', 'Tax'],
      donutSub: 'expenses',
    },
    employee: {
      flagship: 'Flagship feature',
      eyebrow: 'MyEmployee',
      title: 'Track profitability down to the employee hour',
      desc: 'Track employee time, project costs, and client profitability with complete visibility — so you always know which work actually pays.',
      bullets: [
        'Time tracking per project',
        'Cost per employee hour',
        'Client / project allocation',
        'Profitability reports',
        'Performance metrics',
        'Billable utilization',
      ],
    },
    employeeMockup: {
      title: 'Employee profitability',
      sub: 'Q2 · all projects',
      roles: ['Senior Acct', 'Tax Advisor', 'Bookkeeper', 'Analyst'],
      revenueByClient: 'Revenue by client',
      avgMarginHr: 'avg margin / hr',
      billableRate: 'billable rate',
    },
  },
  howItWorks: {
    eyebrow: 'How it works',
    title: 'From raw invoices to clarity in three steps',
    steps: [
      {
        title: 'Connect your data',
        desc: 'Securely link your invoice and accounting data through MyData and your existing tools.',
      },
      {
        title: 'Axion analyzes',
        desc: 'Our engine categorizes transactions and models your business operations in real time.',
      },
      {
        title: 'Get actionable insights',
        desc: 'Receive clear forecasts, alerts, and profitability reports you can act on immediately.',
      },
    ],
  },
  benefits: {
    eyebrow: 'Why Axion',
    title: 'Built to make your business measurably better',
    items: [
      {
        title: 'Reduce liquidity risk',
        desc: 'See VAT and cash obligations ahead of time and avoid nasty surprises.',
      },
      {
        title: 'Improve profitability',
        desc: 'Spot low-margin work and double down on what actually pays.',
      },
      {
        title: 'Track employee efficiency',
        desc: 'Understand cost and output per hour across your whole team.',
      },
      {
        title: 'Make smarter decisions',
        desc: 'Replace gut feel with live, data-driven financial insight at every level.',
      },
      {
        title: 'Centralize business intelligence',
        desc: 'One source of truth for VAT, P&L, and profitability across every business.',
      },
    ],
  },
  cta: {
    badge: 'See Axion on your own data',
    title: 'Run Your Business With Clarity',
    subtitle:
      'Join the accounting firms and SMEs turning invoice data into confident financial decisions.',
    primary: 'Schedule Demo',
    secondary: 'Start Free Trial',
  },
  footer: {
    tagline:
      'Financial intelligence for accounting firms and SMEs. Predict, analyze, and grow with clarity.',
    location: 'Athens, Greece',
    columns: [
      { title: 'Product', links: ['Features', 'MyVAT Prediction', 'P&L Analysis', 'MyEmployee'] },
      { title: 'Company', links: ['About', 'Careers', 'Blog', 'Contact'] },
      { title: 'Resources', links: ['Documentation', 'MyData guide', 'Pricing', 'Security'] },
    ],
    rights: 'All rights reserved.',
    legal: ['Privacy', 'Terms', 'Cookies'],
  },
  meta: {
    title: 'Axion — Financial Intelligence for Modern Businesses',
    description:
      'Predict VAT liabilities, analyze business performance, and track employee profitability in one intelligent platform. Built for accounting firms and SMEs.',
  },
}

export default en

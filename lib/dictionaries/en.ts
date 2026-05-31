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
    badge: 'Financial intelligence · AADE / MyData ready',
    titleLead: 'Financial clarity for Greek businesses ',
    titleHighlight: 'before tax deadlines hit.',
    subtitle:
      'Axion turns AADE/myDATA invoice data into VAT forecasts, P&L insights, cash flow visibility, and decision-ready dashboards for accounting firms and SMEs.',
    ctaPrimary: 'Request Demo',
    ctaSecondary: 'View Features',
    rating: 'No credit card required · 14-day trial',
    trustBullets: [
      'Built for Greek accounting workflows',
      'VAT and P&L forecasting',
      'AADE/myDATA-ready architecture',
      'Designed for accounting firms and SMEs',
    ],
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
    badges: ['AADE / myDATA', 'GDPR compliant', 'SSL encrypted'],
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
  problem: {
    eyebrow: 'The Problem',
    title: 'Greek businesses should not discover their VAT bill at the last minute.',
    items: [
      {
        title: 'VAT surprises at the deadline',
        desc: 'Businesses find out about VAT obligations too late to plan ahead or avoid cash pressure.',
      },
      {
        title: 'Too much manual work',
        desc: 'Accountants spend hours preparing numbers that should be automated and ready in seconds.',
      },
      {
        title: 'Profit unknown until it is too late',
        desc: 'Owners do not know their true profit or cash position until well after the period ends.',
      },
      {
        title: 'Cash decisions without data',
        desc: 'Cash flow decisions are made on incomplete or outdated financial data.',
      },
    ],
  },
  solution: {
    eyebrow: 'The Solution',
    title: 'From invoice data to financial decisions.',
    subtitle:
      'Axion organizes your financial data and turns it into actionable intelligence before deadlines hit.',
    items: [
      {
        title: 'Structured financial data',
        desc: 'Designed to connect with AADE/myDATA workflows and pull structured invoice and tax data.',
      },
      {
        title: 'Revenue, expenses, VAT, and profit — organized',
        desc: 'Everything is categorized automatically with no manual entry required.',
      },
      {
        title: 'Upcoming VAT obligations ahead of time',
        desc: 'See your expected VAT bill before the deadline — not the morning of.',
      },
      {
        title: 'Proactive client advice',
        desc: 'Accountants give clients informed, data-driven conversations instead of just compliance updates.',
      },
      {
        title: 'Earlier performance visibility',
        desc: 'SMEs understand how the business is performing weeks before month-end, not after.',
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
  featureGrid: {
    eyebrow: 'More capabilities',
    title: 'Everything your accounting practice needs.',
    items: [
      {
        title: 'Cash Flow Visibility',
        desc: 'Track cash inflows and outflows to understand your real liquidity position at any point in the period.',
        comingSoon: false,
      },
      {
        title: 'Client Dashboards',
        desc: 'Give every client a dedicated performance dashboard covering VAT, P&L, and cash position.',
        comingSoon: false,
      },
      {
        title: 'AADE / myDATA Data Layer',
        desc: 'Designed to connect with AADE/myDATA workflows. Invoice data structured and ready for analysis.',
        comingSoon: false,
      },
      {
        title: 'Local Vault',
        desc: 'Coming later. Private or manual data stored locally — off the central database, fully under your control.',
        comingSoon: true,
      },
    ],
  },
  dashboardPreview: {
    eyebrow: 'Dashboard preview',
    title: 'Your financial position, at a glance.',
    subtitle:
      'A single view of revenue, expenses, VAT, profit, and cash — before the deadline hits.',
    overviewLabel: 'Financial overview',
    overviewSub: 'Current period · Demo data',
    liveLabel: 'Live',
    trendLabel: 'Monthly revenue trend',
    note: 'Figures above are illustrative demo metrics.',
    metrics: [
      { label: 'Revenue', value: '€48,200', trend: '+12%', color: 'green' },
      { label: 'Expenses', value: '€31,400', trend: '+4%', color: 'red' },
      { label: 'Est. VAT Payable', value: '€4,860', trend: 'Due in 18 days', color: 'amber' },
      { label: 'Current Profit', value: '€16,800', trend: '+28%', color: 'green' },
      { label: 'Cash Position', value: '€22,300', trend: 'Healthy', color: 'green' },
    ],
  },
  audiences: {
    accounting: {
      eyebrow: 'For accounting firms',
      title: 'Built for accounting firms managing many clients.',
      items: [
        'Monitor client VAT exposure earlier',
        'Spot unusual revenue or expense movements',
        'Prepare better client conversations',
        'Reduce manual spreadsheet work',
        'Create a premium advisory layer on top of compliance work',
      ],
      cta: 'Request Demo',
    },
    sme: {
      eyebrow: 'For SMEs',
      title: 'For SMEs that want to know the numbers before it is too late.',
      items: [
        'Understand current profit',
        'See expected VAT payable',
        'Track expenses and revenue movement',
        'Improve cash planning',
        'Make decisions before month-end panic',
      ],
      cta: 'Request Demo',
    },
  },
  howItWorks: {
    eyebrow: 'How it works',
    title: 'From data to decisions in five steps.',
    steps: [
      {
        title: 'Connect financial data',
        desc: 'Designed to connect with AADE/myDATA workflows and your existing accounting tools.',
      },
      {
        title: 'Organize invoices',
        desc: 'Revenue, expenses, and VAT are automatically structured and classified.',
      },
      {
        title: 'Forecast VAT and profit',
        desc: 'Axion builds forward-looking forecasts from your actual invoice activity.',
      },
      {
        title: 'Review dashboards',
        desc: 'Your team and clients see clear, decision-ready summaries — no spreadsheets needed.',
      },
      {
        title: 'Make better decisions earlier',
        desc: 'Act before deadlines hit, not after. Proactive advice instead of reactive compliance.',
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
    title: 'Ready to see your VAT and profit before the deadline?',
    subtitle:
      'Join the accounting firms and SMEs turning invoice data into confident financial decisions.',
    primary: 'Request Demo',
    secondary: 'Contact Us',
  },
  footer: {
    tagline:
      'Financial intelligence for accounting firms and SMEs. Predict, analyze, and grow with clarity.',
    location: 'Athens, Greece',
    columns: [
      { title: 'Product', links: ['Features', 'MyVAT Prediction', 'P&L Analysis', 'MyEmployee'] },
      { title: 'Solutions', links: ['For Accounting Firms', 'For SMEs', 'Contact'] },
      { title: 'Legal', links: ['Privacy', 'Terms of Use', 'Cookies'] },
    ],
    rights: 'All rights reserved.',
    legal: ['Privacy', 'Terms', 'Cookies'],
  },
  lead: {
    eyebrow: 'Get started',
    title: 'Book a demo on your own data',
    subtitle: "Fill in the form and we'll get back to you within one business day.",
    name: 'Full name',
    namePlaceholder: 'Your name',
    email: 'Email',
    emailPlaceholder: 'you@company.com',
    phone: 'Phone',
    phonePlaceholder: 'Your phone number',
    company: 'Company',
    companyPlaceholder: 'Company name',
    submit: 'Request demo',
    sending: 'Sending…',
    successTitle: 'Thank you!',
    success: "We've received your request — we'll be in touch shortly.",
    privacy: 'Your details are safe. No spam, ever.',
    requiredError: 'Please fill in this field',
    emailError: 'Enter a valid email',
  },
  stickyCta: 'Request demo',
  meta: {
    title: 'Axion — Financial Intelligence for Greek Businesses',
    description:
      'Axion turns AADE/myDATA invoice data into VAT forecasts, P&L insights, and decision-ready dashboards. Built for accounting firms and SMEs.',
  },
}

export default en

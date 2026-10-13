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
  appMock: {
    brandSub: 'Financial Intelligence',
    products: ['MyEmployee', 'VAT Analysis', 'MyCFO'],
    toolsLabel: 'Tools',
    tools: ['Overview', 'Employees', 'Clients', 'Client board', 'Entries', 'API Keys', 'Settings'],
  },
  heroDashboard: {
    address: 'app.axion.io / dashboard',
    title: 'Overview',
    subtitle: 'The big picture of your business',
    ranges: ['Week', 'Month', 'Prev.', 'Quarter', 'Year', 'All'],
    kpis: ['Revenue', 'Labour cost', 'Contribution', 'Utilization'],
    kpiSubs: ['4 clients with activity', 'logged', 'margin', 'unbilled'],
    points: 'pp',
    months: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
    hoursTitle: 'Working hours',
    hoursStats: ['Hours', 'Billable', 'Clients', 'Employees'],
    trendTitle: 'Profitability trend',
    trendSub: 'over the last 6 months',
    revenue: 'Revenue',
    cost: 'Cost',
    contribution: 'contribution',
    floatAlertTitle: 'Management alert',
    floatAlertSub: 'Ilios Studio: 8% margin — below the 15% floor',
    floatUtilTitle: 'Utilization 84.2%',
    floatUtilSub: 'above the 75% target',
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
      title: 'Predict VAT before the period closes',
      desc: 'Axion syncs your invoices from AADE myDATA and estimates the current period’s VAT, with a range and a confidence level.',
      bullets: [
        'Period VAT forecast with a low – high range',
        'Liquidity warning when VAT jumps',
        'Automatic categorization with a review queue for the accountant',
      ],
      chips: ['myDATA sync', 'Category review'],
    },
    vatMockup: {
      title: 'VAT forecast',
      sub: 'Q4 · from myDATA',
      payable: 'estimated payable',
      confidence: 'High confidence',
      range: 'Range',
      alert: 'Forecast VAT is significantly higher than the previous period — plan your cash.',
      netByPeriod: 'Net VAT by quarter',
      periods: ['Q2', 'Q3', 'Q4'],
      forecastTag: 'forecast',
    },
    pnl: {
      soon: 'Coming soon · MyCFO',
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
      desc: 'See hours, cost and contribution per employee and per client with complete visibility — so you always know which work actually pays.',
      bullets: [
        'Time entries per client (manual or via API)',
        'Full cost per employee hour',
        'Revenue & contribution per client',
        'Profitability per employee',
        'Day completeness vs. daily target',
        'Billable utilization & targets',
      ],
    },
    employeeMockup: {
      title: 'Employee profitability',
      sub: 'October · all clients',
      cost: 'cost',
      revenue: 'revenue',
      perHour: 'h',
      contribution: 'contribution',
      belowTarget: 'days below target',
      revenueByClient: 'Revenue by client',
      month: 'October',
      avgMarginHr: 'avg margin / hour',
      daysBelowTarget: 'days below the daily target',
    },
  },
  featureGrid: {
    eyebrow: 'More capabilities',
    title: 'Everything your accounting practice needs.',
    soon: 'Soon',
    items: [
      {
        title: 'Management alerts',
        desc: 'Rules on your real numbers flag low-margin clients, hour-budget overruns and low utilization.',
        comingSoon: false,
      },
      {
        title: 'Time-tracking API',
        desc: 'Your time-tracking app pushes entries with an API key — idempotent, no double entry, no retyping.',
        comingSoon: false,
      },
      {
        title: 'AADE / myDATA Data Layer',
        desc: 'Invoices synced from myDATA, categorized automatically, with a review queue for the accountant.',
        comingSoon: false,
      },
      {
        title: 'Cash flow & client dashboards',
        desc: 'MyCFO brings P&L, cash position and a dashboard per client. In development.',
        comingSoon: true,
      },
    ],
  },
  dashboardPreview: {
    eyebrow: 'Dashboard preview',
    title: 'Your VAT position, before the period closes.',
    subtitle:
      'The VAT Analysis page as you see it after signing in: the period VAT forecast, output vs. input VAT, and invoices to review — straight from myDATA.',
    address: 'app.axion.io / dashboard / vat',
    subtitleApp: 'VAT analysis & forecast · myDATA / AADE',
    basis: ['Quarter', 'Month'],
    sync: 'Sync with AADE',
    syncStatus: 'myDATA connection: production · Last sync: today 08:30',
    predictionTitle: 'VAT forecast for Q4',
    confidence: 'High confidence',
    payableLabel: 'estimated VAT payable',
    rangeLabel: 'Range',
    daysLeft: '18 days left in the period',
    warningTitle: 'Liquidity warning:',
    warning: 'forecast VAT is significantly higher than the previous period — plan your cash.',
    disclaimer: 'Estimate for information only — an accountant must review before any VAT return.',
    stats: [
      { title: 'VAT payable (confirmed)', sub: 'Period Q4 · 142 invoices' },
      { title: 'Output VAT (sales)', sub: 'Net revenue €38,000' },
      { title: 'Input VAT (deductible)', sub: 'Net expenses €21,580' },
      { title: 'Invoices to review', sub: 'Category confirmation needed' },
    ],
    trendTitle: 'VAT trend by period',
    trendSub: 'Last 6 quarters · output vs. input',
    legend: ['Output VAT', 'Input VAT'],
    breakdownTitle: 'VAT by category',
    breakdownSub: 'Current period · top categories',
    categories: [
      'Service revenue (income)',
      'Goods purchases (expense)',
      'Sales revenue (income)',
      'Third-party fees (expense)',
    ],
    note: 'Illustrative demo data. The real page fills in from your own myDATA invoices.',
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

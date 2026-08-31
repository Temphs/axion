import type { Dictionary } from './el'

const en: Dictionary = {
  nav: {
    links: ['The problem', 'How it works', 'Dashboard', 'Contact'],
    signIn: 'Sign in',
    bookDemo: 'Book a Demo',
    home: 'Axion home',
    toggleMenu: 'Toggle menu',
  },
  hero: {
    badge: 'MyEmployee · Available now',
    titleLead: 'Know which clients are ',
    titleHighlight: 'actually profitable.',
    subtitle:
      'Axion connects employee time with labor cost and client revenue, so accounting firms can see which clients make money — and which ones consume their margin.',
    ctaPrimary: 'Book a Demo',
    ctaSecondary: 'See How It Works',
    trustBullets: [
      'Built for firms of 5–30 people',
      'Labor cost per client',
      'No employee surveillance',
    ],
  },
  heroDashboard: {
    address: 'app.axion.io / overview',
    period: 'April 2026',
    vsPrevious: 'vs last month',
    kpis: [
      { label: 'Team Hours', value: '2,184h', delta: '+6.2%' },
      { label: 'Labor Cost', value: '€24,620', delta: '+3.1%' },
      { label: 'Active Clients', value: '83', delta: '' },
      { label: 'Entries Completed', value: '93%', delta: '' },
    ],
    tableTitle: 'Client Profitability',
    tableSub: 'Fee − labor cost = contribution',
    columns: ['Client', 'Monthly Fee', 'Hours', 'Labor Cost', 'Contribution', 'Margin'],
    rows: [
      { name: 'Alpha Ltd', fee: '€850', hours: '14h', cost: '€290', contribution: '€560', margin: '66%', watch: false },
      { name: 'Beta SA', fee: '€600', hours: '27h', cost: '€510', contribution: '€90', margin: '15%', watch: true },
      { name: 'Gamma PC', fee: '€1,100', hours: '18h', cost: '€350', contribution: '€750', margin: '68%', watch: false },
    ],
    watchLabel: 'low margin',
    floatContributionTitle: 'Contribution €12.4k',
    floatContributionSub: 'this month',
    floatMarginTitle: 'Beta SA · 15% margin',
    floatMarginSub: 'worth a pricing review',
  },
  trust: {
    eyebrow: 'Built for accounting firms',
    badges: ['GDPR', 'SSL encrypted', 'No screenshots'],
    indicators: [
      {
        title: '27 days of data collected',
        desc: 'Every figure comes with how complete the data behind it actually is.',
      },
      {
        title: '93% entry completeness',
        desc: 'See which days are missing before you rely on a margin.',
      },
      {
        title: 'No monitoring',
        desc: 'No screenshots, no keystroke tracking, no employee scores.',
      },
    ],
  },
  problem: {
    eyebrow: 'The problem',
    title: 'You know what clients pay. Do you know what they cost?',
    items: [
      {
        title: 'Fixed monthly fees hide the time',
        desc: 'A flat monthly fee never tells you how much staff time that client actually consumed.',
      },
      {
        title: 'Your highest-paying client may not be your most profitable',
        desc: 'A €1,000 client requiring 35 staff hours can be worse than a €600 client requiring 8.',
      },
      {
        title: 'Pricing decisions are based on intuition',
        desc: 'Fee changes get decided without real labor cost in front of you.',
      },
    ],
    note: 'Axion gives owners actual labor cost and client margin before the next pricing conversation.',
  },
  howItWorks: {
    eyebrow: 'How it works',
    title: 'Three steps, one closed loop.',
    steps: [
      {
        title: 'Employees log their work',
        desc: 'Client → task → time. Designed to take only a few seconds.',
      },
      {
        title: 'Axion calculates actual labor cost',
        desc: 'Employee cost is allocated to clients based on actual time spent.',
      },
      {
        title: 'Owners see client profitability',
        desc: 'Compare monthly fee, labor cost, contribution, and margin in one place.',
      },
    ],
  },
  ownerDashboard: {
    eyebrow: 'Owner dashboard',
    title: 'Your accounting firm in one screen.',
    subtitle:
      "See where your team's hours went, what they cost, and which clients are consuming your margin.",
    address: 'app.axion.io / overview',
    period: 'April 2026 · illustrative figures',
    metrics: [
      { label: 'Team Hours', value: '2,184h', sub: '9 people logged time' },
      { label: 'Labor Cost', value: '€24,620', sub: '87% on billable clients' },
      { label: 'Active Clients', value: '83', sub: '61 with activity' },
      { label: 'Entries Completed', value: '93%', sub: '21 working days' },
    ],
    profitabilityTitle: 'Client Profitability',
    profitabilitySub: 'Does the fee cover the time it takes?',
    columns: ['Client', 'Monthly Fee', 'Hours', 'Labor Cost', 'Contribution', 'Margin'],
    rows: [
      { name: 'Gamma PC', fee: '€1,100', hours: '18h', cost: '€350', contribution: '€750', margin: '68%', watch: false },
      { name: 'Alpha Ltd', fee: '€850', hours: '14h', cost: '€290', contribution: '€560', margin: '66%', watch: false },
      { name: 'Delta PC', fee: '€780', hours: '22h', cost: '€430', contribution: '€350', margin: '45%', watch: false },
      { name: 'Beta SA', fee: '€600', hours: '27h', cost: '€510', contribution: '€90', margin: '15%', watch: true },
    ],
    timeTitle: 'Where team time went',
    timeSub: 'Hours per client, this month',
    timeRows: [
      { name: 'Beta SA', hours: '27h', pct: 100 },
      { name: 'Delta PC', hours: '22h', pct: 81 },
      { name: 'Gamma PC', hours: '18h', pct: 67 },
      { name: 'Alpha Ltd', hours: '14h', pct: 52 },
      { name: 'Internal', hours: '9h', pct: 33 },
    ],
    formula: 'Contribution = Fee − Labor cost · Margin = Contribution ÷ Fee',
    watchLabel: 'low margin',
  },
  attention: {
    eyebrow: 'Clients needing attention',
    title: 'Know where to look first.',
    subtitle: 'Three items at most. Not a notification centre, not an alert queue.',
    items: [
      { name: 'Papadakis SA', reason: 'Labor cost increased 31% this month.' },
      { name: 'Alpha Ltd', reason: '84% of the monthly fee has been consumed by labor cost.' },
      { name: 'Delta PC', reason: 'Margin fell from 44% to 19%.' },
    ],
    note: 'Each item states the rule that produced it, so you can judge it yourself.',
  },
  terminal: {
    eyebrow: 'For employees',
    title: 'Built for employees to actually use.',
    subtitle:
      'No spreadsheets. No complicated timesheets. Employees select the client, task, and time in seconds.',
    bullets: [
      'A personal link — no account, no password',
      'The clients they worked on recently come first',
      'They fix their own mistakes without calling you',
    ],
    objection: 'Employees never see costs, fees, percentages or scores. They only see what they logged.',
    mock: {
      greeting: 'Hi',
      name: 'Maria',
      today: 'Today',
      dayHours: '6.5h logged',
      clientLabel: 'Client',
      clients: ['Alpha Ltd', 'Beta SA', 'Gamma PC', 'Delta PC'],
      searchLabel: 'Another client…',
      hoursLabel: 'Hours',
      taskLabel: 'Task',
      tasks: ['Bookkeeping', 'VAT', 'Payroll'],
      submit: 'Log time',
      listTitle: 'Today',
      entries: [
        { client: 'Alpha Ltd', task: 'Bookkeeping', hours: '4h' },
        { client: 'Beta SA', task: 'VAT', hours: '2.5h' },
      ],
    },
  },
  team: {
    eyebrow: 'Team overview',
    title: 'Operational facts, not scores.',
    subtitle:
      'Hours, client work, overhead and labor cost. No ranking, no productivity score.',
    columns: ['Employee', 'Logged Hours', 'Client Work', 'Overhead', 'Labor Cost'],
    rows: [
      { name: 'Maria P.', logged: '164h', client: '142h', overhead: '22h', cost: '€3,240' },
      { name: 'Nikos K.', logged: '151h', client: '128h', overhead: '23h', cost: '€2,910' },
    ],
    note: 'We do not show employee leaderboards, performance scores or ambiguous percentages.',
  },
  modules: {
    eyebrow: 'Roadmap',
    title: 'Axion is becoming the financial intelligence layer for your firm.',
    subtitle: 'One module at a time, and only when it is genuinely ready.',
    availableLabel: 'Available now',
    soonLabel: 'Coming soon',
    items: [
      {
        name: 'MyEmployee',
        desc: 'Employee time, labor cost and client-level profitability.',
        available: true,
      },
      {
        name: 'MyVAT',
        desc: 'VAT estimation from the firm’s invoicing data.',
        available: false,
      },
      {
        name: 'P&L Intelligence',
        desc: 'Revenue, expenses and margins at firm level.',
        available: false,
      },
    ],
    note: 'Anything not available is labelled as such. We do not sell features that do not exist yet.',
  },
  cta: {
    badge: 'See it on your own data',
    title: 'Which clients actually leave you a profit?',
    subtitle:
      'Book a demo. You will see client profitability with your own numbers, not with examples.',
    primary: 'Book a Demo',
    secondary: 'Contact Us',
  },
  footer: {
    tagline:
      'Client profitability for accounting firms. Time, labor cost and margin — in one place.',
    location: 'Athens, Greece',
    columns: [
      { title: 'Product', links: ['MyEmployee', 'How it works', 'Dashboard'] },
      { title: 'Company', links: ['For accounting firms', 'Roadmap', 'Contact'] },
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
    company: 'Firm',
    companyPlaceholder: 'Firm name',
    submit: 'Book a demo',
    sending: 'Sending…',
    successTitle: 'Thank you!',
    success: "We've received your request — we'll be in touch shortly.",
    privacy: 'Your details are safe. No spam, ever.',
    requiredError: 'Please fill in this field',
    emailError: 'Enter a valid email',
  },
  stickyCta: 'Book a demo',
  meta: {
    title: 'Axion — Client Profitability for Accounting Firms',
    description:
      'Axion connects employee time with labor cost and client revenue, so accounting firms can see which clients are actually profitable.',
  },
}

export default en

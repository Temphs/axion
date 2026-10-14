import 'server-only'
import { prisma } from '@/lib/db'
import { schemaStatus } from '@/lib/admin/schema'
import { businessToday } from '@/lib/entryDate'
import type { FixId } from '@/lib/admin/fixes'

// Live checks for the admin console. Each alert says what is wrong in plain
// words and either points at a one-click fix or lists the manual steps.

export type Severity = 'critical' | 'warning' | 'info'

export type Alert = {
  id: string
  severity: Severity
  title: string
  detail: string
  steps?: string[]
  fixId?: FixId
}

const DAY_MS = 86_400_000
const isProd = () => process.env.NODE_ENV === 'production'
const day = (offset: number) => new Date(businessToday().getTime() - offset * DAY_MS).toISOString().slice(0, 10)

export async function runHealthChecks(): Promise<Alert[]> {
  const alerts: Alert[] = []

  // 1. Database objects the code expects.
  try {
    const missing = await schemaStatus()
    if (missing.length) {
      alerts.push({
        id: 'schema',
        severity: 'critical',
        title: 'The database is missing changes this version needs',
        detail: missing.map((s) => `${s.label}: ${s.missing.join(', ')}`).join(' · '),
        fixId: 'schema',
      })
    }
  } catch (err) {
    alerts.push({
      id: 'db',
      severity: 'critical',
      title: 'Cannot read the database',
      detail: err instanceof Error ? err.message.slice(0, 300) : 'Unknown database error',
      steps: ['Check TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in Vercel → Settings → Environment Variables', 'Check the database status in the Turso dashboard'],
    })
    return alerts // nothing else can be checked without the database
  }

  // 2. Email (password reset).
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    alerts.push({
      id: 'email',
      severity: isProd() ? 'warning' : 'info',
      title: 'Password-reset emails are not being sent',
      detail: 'No email service is configured, so "forgot password" cannot deliver a link.',
      steps: [
        'Get a domain you own (Vercel → Settings → Domains → Buy)',
        'Create a Resend account, add the domain and paste its DNS records',
        'Add RESEND_API_KEY and EMAIL_FROM in Vercel → Settings → Environment Variables, then redeploy',
      ],
    })
  }
  if (isProd() && !process.env.APP_URL && !process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    alerts.push({
      id: 'app-url',
      severity: 'warning',
      title: 'APP_URL is not set',
      detail: 'Links in emails need the public address of the site.',
      steps: ['Add APP_URL (e.g. https://your-domain) in Vercel → Settings → Environment Variables, then redeploy'],
    })
  }

  // 3. Encryption key for stored myDATA credentials.
  if (!process.env.AXION_ENCRYPTION_KEY || process.env.AXION_ENCRYPTION_KEY.length < 16) {
    alerts.push({
      id: 'encryption-key',
      severity: 'warning',
      title: 'AXION_ENCRYPTION_KEY is missing or too short',
      detail: 'Customers cannot save their myDATA (AADE) connection without it.',
      steps: ['Generate a random string of 32+ characters', 'Add it as AXION_ENCRYPTION_KEY in Vercel and redeploy. Never change it afterwards: saved credentials would become unreadable'],
    })
  }

  // 4. Admin list.
  if (!process.env.ADMIN_EMAILS) {
    alerts.push({
      id: 'admin-emails',
      severity: 'info',
      title: 'ADMIN_EMAILS is not set in this environment',
      detail: 'Only accounts listed there can open this console.',
    })
  }

  // 5. Monitoring-derived alerts (skip quietly if those tables aren't there yet).
  try {
    const [emailErrors, recentErrors, failedToday, failedWeek] = await Promise.all([
      prisma.errorEvent.findFirst({ where: { kind: 'email', status: 'open' }, orderBy: { lastSeenAt: 'desc' } }),
      prisma.errorEvent.count({ where: { status: 'open', lastSeenAt: { gte: new Date(Date.now() - DAY_MS) } } }),
      prisma.metricDaily.findUnique({ where: { day_key: { day: day(0), key: 'login_failed' } } }),
      prisma.metricDaily.aggregate({ where: { key: 'login_failed', day: { gte: day(7), lt: day(0) } }, _sum: { count: true } }),
    ])

    if (emailErrors) {
      alerts.push({
        id: 'email-failing',
        severity: 'critical',
        title: 'Emails are failing',
        detail: `${emailErrors.message} (${emailErrors.count}×, last ${emailErrors.lastSeenAt.toISOString().slice(0, 16).replace('T', ' ')} UTC)`,
        steps: [
          'HTTP 401/403: the API key is wrong, or the sender domain is not verified in Resend',
          'Not configured: add RESEND_API_KEY and EMAIL_FROM in Vercel and redeploy',
          'Then mark the error as resolved below',
        ],
      })
    }
    if (recentErrors > 0) {
      alerts.push({
        id: 'errors-24h',
        severity: 'warning',
        title: `${recentErrors} open error${recentErrors === 1 ? '' : 's'} in the last 24 hours`,
        detail: 'See the error list below for where they happened and how often.',
      })
    }
    const today = failedToday?.count ?? 0
    const dailyAverage = (failedWeek._sum.count ?? 0) / 7
    if (today >= 30 && today >= 5 * Math.max(dailyAverage, 1)) {
      alerts.push({
        id: 'login-spike',
        severity: 'warning',
        title: `Unusual number of failed logins today (${today})`,
        detail: `The 7-day average is ${dailyAverage.toFixed(1)} a day. Someone may be guessing passwords; the per-IP and per-email limits are slowing them down.`,
        steps: ['Check Vercel → Logs for "login_failed"', 'Consider turning on Vercel Firewall rate limiting for /api/auth/*'],
      })
    }
  } catch {
    // Monitoring tables not created yet: the schema alert above covers it.
  }

  // 6. Data quality: entries stored before validation existed.
  const [futureEntries, hugeEntries] = await Promise.all([
    prisma.workEntry.count({ where: { date: { gt: new Date(businessToday().getTime() + DAY_MS) } } }),
    prisma.workEntry.count({ where: { minutes: { gt: 24 * 60 } } }),
  ])
  if (futureEntries + hugeEntries > 0) {
    alerts.push({
      id: 'data-quality',
      severity: 'info',
      title: 'Some time entries look wrong',
      detail: `${futureEntries} dated in the future, ${hugeEntries} longer than 24 hours (saved before today's validation existed).`,
      steps: ['Ask the affected customers to correct them in Καταχωρήσεις. They are customer data, so they are not changed automatically'],
    })
  }

  const order: Record<Severity, number> = { critical: 0, warning: 1, info: 2 }
  return alerts.sort((a, b) => order[a.severity] - order[b.severity])
}

import 'server-only'
import { prisma } from '@/lib/db'
import { businessToday } from '@/lib/entryDate'

// Numbers for the admin console. Website traffic comes from the cookieless
// page-view counts; product usage comes straight from the app's own tables
// and daily counters, so it needs no tracking at all.

const DAY_MS = 86_400_000
const dayOf = (offset: number) => new Date(businessToday().getTime() - offset * DAY_MS).toISOString().slice(0, 10)

export type Ranked = { label: string; value: number }

export type Analytics = {
  traffic: {
    available: boolean
    days: { day: string; views: number }[] // last 30 days, oldest first, zero-filled
    today: number
    last7: number
    prev7: number
    last30: number
    topPages: Ranked[]
    referrers: Ranked[]
    countries: Ranked[]
    devices: Ranked[]
  }
  product: {
    accounts: number
    signups7: number
    signups30: number
    logins7: number | null
    failedLogins7: number | null
    activeAccounts7: number
    entries7: number
    terminalEntries7: number | null
    apiEntries7: number | null
    activeLinks: number
    resetRequests7: number | null
  }
}

async function metricSum(key: string, fromDay: string): Promise<number | null> {
  try {
    const r = await prisma.metricDaily.aggregate({ where: { key, day: { gte: fromDay } }, _sum: { count: true } })
    return r._sum.count ?? 0
  } catch {
    return null // table not created yet
  }
}

function ranked(rows: { label: string; value: number }[], limit: number): Ranked[] {
  return rows.sort((a, b) => b.value - a.value).slice(0, limit)
}

async function traffic(): Promise<Analytics['traffic']> {
  const from30 = dayOf(29)
  const empty = { available: false, days: [], today: 0, last7: 0, prev7: 0, last30: 0, topPages: [], referrers: [], countries: [], devices: [] }
  try {
    const [byDay, byPath, byRef, byCountry, byDevice, prev] = await Promise.all([
      prisma.pageViewDaily.groupBy({ by: ['day'], where: { day: { gte: from30 } }, _sum: { views: true } }),
      prisma.pageViewDaily.groupBy({ by: ['path'], where: { day: { gte: from30 } }, _sum: { views: true } }),
      prisma.pageViewDaily.groupBy({ by: ['referrer'], where: { day: { gte: from30 }, referrer: { not: '' } }, _sum: { views: true } }),
      prisma.pageViewDaily.groupBy({ by: ['country'], where: { day: { gte: from30 }, country: { not: '' } }, _sum: { views: true } }),
      prisma.pageViewDaily.groupBy({ by: ['device'], where: { day: { gte: from30 } }, _sum: { views: true } }),
      prisma.pageViewDaily.aggregate({ where: { day: { gte: dayOf(13), lte: dayOf(7) } }, _sum: { views: true } }),
    ])
    const views = new Map(byDay.map((d) => [d.day, d._sum.views ?? 0]))
    const days = Array.from({ length: 30 }, (_, i) => {
      const day = dayOf(29 - i)
      return { day, views: views.get(day) ?? 0 }
    })
    const sum = (list: { views: number }[]) => list.reduce((s, d) => s + d.views, 0)
    return {
      available: true,
      days,
      today: days[29].views,
      last7: sum(days.slice(23)),
      prev7: prev._sum.views ?? 0,
      last30: sum(days),
      topPages: ranked(byPath.map((r) => ({ label: r.path, value: r._sum.views ?? 0 })), 8),
      referrers: ranked(byRef.map((r) => ({ label: r.referrer, value: r._sum.views ?? 0 })), 6),
      countries: ranked(byCountry.map((r) => ({ label: r.country, value: r._sum.views ?? 0 })), 6),
      devices: ranked(byDevice.map((r) => ({ label: r.device, value: r._sum.views ?? 0 })), 2),
    }
  } catch {
    return empty
  }
}

export async function loadAnalytics(): Promise<Analytics> {
  const since7 = new Date(Date.now() - 7 * DAY_MS)
  const since30 = new Date(Date.now() - 30 * DAY_MS)
  const from7 = dayOf(6)

  const [t, accounts, signups7, signups30, active, entries7, activeLinks, logins7, failedLogins7, terminal7, api7, resets7] =
    await Promise.all([
      traffic(),
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: since7 } } }),
      prisma.user.count({ where: { createdAt: { gte: since30 } } }),
      prisma.workEntry.groupBy({ by: ['userId'], where: { createdAt: { gte: since7 } } }),
      prisma.workEntry.count({ where: { createdAt: { gte: since7 } } }),
      prisma.employee.count({ where: { active: true, accessToken: { not: null } } }).catch(() => 0),
      metricSum('login', from7),
      metricSum('login_failed', from7),
      metricSum('terminal_entry', from7),
      metricSum('api_entries', from7),
      metricSum('password_reset_requested', from7),
    ])

  return {
    traffic: t,
    product: {
      accounts,
      signups7,
      signups30,
      logins7,
      failedLogins7,
      activeAccounts7: active.length,
      entries7,
      terminalEntries7: terminal7,
      apiEntries7: api7,
      activeLinks,
      resetRequests7: resets7,
    },
  }
}

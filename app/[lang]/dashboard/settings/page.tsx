import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { getSettings } from '@/lib/settings'
import { AccountSettings } from '@/components/dashboard/AccountSettings'

export default async function SettingsPage({ params }: PageProps<'/[lang]/dashboard/settings'>) {
  const { lang } = await params
  const user = await getCurrentUser()
  if (!user) redirect(`/${lang}/login`)

  const [settings, employees, employeeCount, clientCount, entryCount] = await Promise.all([
    getSettings(user.id),
    prisma.employee.findMany({
      where: { userId: user.id },
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
      select: { id: true, name: true, active: true, monthlyCost: true, contractHoursPerMonth: true },
    }),
    prisma.employee.count({ where: { userId: user.id } }),
    prisma.client.count({ where: { userId: user.id } }),
    prisma.workEntry.count({ where: { userId: user.id } }),
  ])

  return (
    <AccountSettings
      account={{
        email: user.email,
        name: user.name,
        createdAt: user.createdAt.toISOString(),
        employeeCount,
        clientCount,
        entryCount,
      }}
      settings={{
        hoursPerDay: settings.hoursPerDay,
        daysPerMonth: settings.daysPerMonth,
        includeOverhead: settings.includeOverhead,
      }}
      employees={employees}
    />
  )
}

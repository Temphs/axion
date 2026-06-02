import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getSettings } from '@/lib/settings'
import { SettingsForm } from '@/components/dashboard/SettingsForm'

export default async function SettingsPage({ params }: PageProps<'/[lang]/dashboard/settings'>) {
  const { lang } = await params
  const user = await getCurrentUser()
  if (!user) redirect(`/${lang}/login`)
  const settings = await getSettings(user.id)
  return (
    <SettingsForm
      initial={{
        hoursPerDay: settings.hoursPerDay,
        daysPerMonth: settings.daysPerMonth,
        includeOverhead: settings.includeOverhead,
      }}
    />
  )
}

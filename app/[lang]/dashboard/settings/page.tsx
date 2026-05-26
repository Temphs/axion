import { getSettings } from '@/lib/settings'
import { SettingsForm } from '@/components/dashboard/SettingsForm'

export default async function SettingsPage() {
  const settings = await getSettings()
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

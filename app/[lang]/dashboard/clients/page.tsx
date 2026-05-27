import { prisma } from '@/lib/db'
import { getClientsStats } from '@/lib/stats'
import { ClientsManager } from '@/components/dashboard/ClientsManager'

export default async function ClientsPage() {
  const [clients, stats] = await Promise.all([
    prisma.client.findMany({ orderBy: { name: 'asc' } }),
    getClientsStats(),
  ])

  const data = clients
    .map((c) => {
      const s = stats.get(c.id)
      return {
        id: c.id,
        name: c.name,
        billable: c.billable,
        monthlyRevenue: c.monthlyRevenue,
        active: c.active,
        notes: c.notes,
        hours: s?.hours ?? 0,
        cost: s?.cost ?? 0,
      }
    })
    // Heaviest clients first so the most significant ones surface immediately.
    .sort((a, b) => b.hours - a.hours || a.name.localeCompare(b.name))

  return <ClientsManager initial={data} />
}

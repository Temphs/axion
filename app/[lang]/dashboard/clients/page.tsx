import { prisma } from '@/lib/db'
import { ClientsManager } from '@/components/dashboard/ClientsManager'

export default async function ClientsPage() {
  const clients = await prisma.client.findMany({ orderBy: { name: 'asc' } })
  const data = clients.map((c) => ({
    id: c.id,
    name: c.name,
    billable: c.billable,
    monthlyRevenue: c.monthlyRevenue,
    active: c.active,
    notes: c.notes,
  }))
  return <ClientsManager initial={data} />
}

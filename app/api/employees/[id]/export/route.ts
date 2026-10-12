import { prisma } from '@/lib/db'
import { authed, fail } from '@/lib/api'
import { jsonDownload, today } from '@/lib/exportResponse'

// One employee's record and every hour logged for them, so the account owner
// (the controller) can answer that employee's GDPR access request.
export async function GET(_req: Request, ctx: RouteContext<'/api/employees/[id]/export'>) {
  const { user, res } = await authed()
  if (res) return res

  const { id } = await ctx.params
  const employee = await prisma.employee.findFirst({ where: { id, userId: user.id } })
  if (!employee) return fail('Employee not found', 404)

  const entries = await prisma.workEntry.findMany({
    where: { employeeId: id, userId: user.id },
    orderBy: { date: 'asc' },
    select: {
      date: true,
      minutes: true,
      workType: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
      client: { select: { name: true } },
    },
  })

  return jsonDownload(
    {
      exportedAt: new Date().toISOString(),
      format: 'axion-employee-export/v1',
      employee,
      workEntries: entries.map(({ client, ...e }) => ({ ...e, hours: e.minutes / 60, client: client.name })),
    },
    `employee-${id}-${today()}.json`
  )
}

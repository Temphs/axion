import { prisma } from '@/lib/db'
import { ok, fail, authed, isUniqueViolation } from '@/lib/api'

// GDPR erasure for an employee who has logged work (and so can't be deleted
// without breaking history): the name and every free-text note about them are
// removed, the person is deactivated, and only hours and cost figures remain
// for the reports. Irreversible.
export async function POST(_req: Request, ctx: RouteContext<'/api/employees/[id]/anonymize'>) {
  const { user, res } = await authed()
  if (res) return res

  const { id } = await ctx.params
  const employee = await prisma.employee.findFirst({ where: { id, userId: user.id }, select: { id: true } })
  if (!employee) return fail('Employee not found', 404)

  // Carries nothing about the person. Names are unique per account, so on the
  // (unlikely) clash of the short suffix fall back to the full id.
  const anonymise = (name: string) =>
    prisma.$transaction([
      prisma.employee.update({
        where: { id },
        data: {
          name,
          notes: null,
          active: false,
          targetUtilizationPct: null,
          targetMonthlyHours: null,
          targetMonthlyContribution: null,
        },
      }),
      prisma.workEntry.updateMany({ where: { employeeId: id, userId: user.id }, data: { notes: null } }),
    ])

  let placeholder = `Anonymised #${id.slice(-8)}`
  try {
    await anonymise(placeholder)
  } catch (e) {
    if (!isUniqueViolation(e)) throw e
    placeholder = `Anonymised #${id}`
    await anonymise(placeholder)
  }

  return ok({ employee: { id, name: placeholder } })
}

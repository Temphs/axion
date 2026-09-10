import { prisma } from '@/lib/db'
import { authed, fail, ok } from '@/lib/api'
import { generateAccessToken } from '@/lib/terminal'

// Creating and revoking an employee's terminal link. Manager session only —
// a terminal token can never mint another one.

async function ownedEmployee(userId: string, id: string) {
  return prisma.employee.findFirst({ where: { id, userId }, select: { id: true } })
}

// POST creates the link, or replaces it: regenerating is how you cut off an
// old phone without deleting the employee.
export async function POST(_request: Request, ctx: RouteContext<'/api/employees/[id]/access-link'>) {
  const { user, res } = await authed()
  if (res) return res

  const { id } = await ctx.params
  if (!(await ownedEmployee(user.id, id))) return fail('Employee not found', 404)

  const employee = await prisma.employee.update({
    where: { id },
    data: { accessToken: generateAccessToken(), accessTokenAt: new Date() },
    select: { accessToken: true, accessTokenAt: true },
  })
  return ok({ accessToken: employee.accessToken, accessTokenAt: employee.accessTokenAt }, { status: 201 })
}

export async function DELETE(_request: Request, ctx: RouteContext<'/api/employees/[id]/access-link'>) {
  const { user, res } = await authed()
  if (res) return res

  const { id } = await ctx.params
  if (!(await ownedEmployee(user.id, id))) return fail('Employee not found', 404)

  await prisma.employee.update({ where: { id }, data: { accessToken: null, accessTokenAt: null } })
  return ok({ accessToken: null })
}

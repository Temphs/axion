import { prisma } from '@/lib/db'
import { ok, fail, readJson, authed } from '@/lib/api'
import { generateApiKey } from '@/lib/auth'

export async function GET() {
  const { res } = await authed()
  if (res) return res

  const keys = await prisma.apiKey.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, prefix: true, lastUsedAt: true, revokedAt: true, createdAt: true },
  })
  return ok({ apiKeys: keys })
}

export async function POST(request: Request) {
  const { res } = await authed()
  if (res) return res

  const body = await readJson<{ name?: string }>(request)
  const name = body?.name?.trim()
  if (!name) return fail('name is required')

  const { token, prefix, hashedKey } = generateApiKey()
  const key = await prisma.apiKey.create({ data: { name, prefix, hashedKey } })

  // The plaintext token is returned only here, once. It is not recoverable later.
  return ok(
    {
      apiKey: { id: key.id, name: key.name, prefix: key.prefix, createdAt: key.createdAt },
      token,
    },
    { status: 201 }
  )
}

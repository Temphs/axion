import { prisma } from '@/lib/db'
import { ApiKeysManager } from '@/components/dashboard/ApiKeysManager'

export default async function ApiKeysPage() {
  const keys = await prisma.apiKey.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, prefix: true, lastUsedAt: true, revokedAt: true, createdAt: true },
  })
  const data = keys.map((k) => ({
    id: k.id,
    name: k.name,
    prefix: k.prefix,
    lastUsedAt: k.lastUsedAt ? k.lastUsedAt.toISOString() : null,
    revokedAt: k.revokedAt ? k.revokedAt.toISOString() : null,
    createdAt: k.createdAt.toISOString(),
  }))
  return <ApiKeysManager initial={data} />
}

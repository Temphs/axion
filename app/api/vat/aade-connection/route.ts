import { ok, fail, authed, readJson } from '@/lib/api'
import { connectionSchema } from '@/services/vat/schemas'
import { resolveAadeConnection, saveAadeConnection, deleteAadeConnection } from '@/services/aade/credentials'

// Manage the tenant's AADE myDATA connection. Secrets are write-only: GET
// returns configuration status, never credential material.
export async function GET() {
  const { user, res } = await authed()
  if (res) return res

  const connection = await resolveAadeConnection(user.id)
  return ok({
    configured: connection.source !== 'none',
    source: connection.source,
    environment: connection.environment,
    entityVatNumber: connection.entityVatNumber ?? null,
    lastSyncedAt: connection.lastSyncedAt?.toISOString() ?? null,
  })
}

export async function PUT(request: Request) {
  const { user, res } = await authed()
  if (res) return res

  const body = await readJson(request)
  if (!body) return fail('Invalid JSON body')

  const parsed = connectionSchema.safeParse(body)
  if (!parsed.success) return fail(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '))

  await saveAadeConnection(user.id, parsed.data)
  return ok({ saved: true })
}

export async function DELETE() {
  const { user, res } = await authed()
  if (res) return res

  await deleteAadeConnection(user.id)
  return ok({ deleted: true })
}

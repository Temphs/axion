import 'server-only'

import { prisma } from '@/lib/db'
import { decryptSecret, encryptSecret } from '@/lib/crypto'
import type { MyDataCredentials, MyDataEnvironment } from './mydataClient'

// Resolves the AADE credentials to use for a tenant. Precedence:
//   1. per-user encrypted credentials stored in AadeConnection
//   2. server env vars AADE_USER_ID / AADE_SUBSCRIPTION_KEY (single-tenant setups)
//   3. mock mode (AADE_ENV=mock) — local demo data, no network
// Plaintext credentials never leave this module except inside MyDataCredentials
// handed to the server-side client; they are never logged or sent to browsers.

export type CredentialSource = 'database' | 'env' | 'mock' | 'none'

export type ResolvedAadeConnection = {
  source: CredentialSource
  credentials: MyDataCredentials | null
  environment: MyDataEnvironment | 'mock'
  entityVatNumber?: string | null
  lastSyncedAt?: Date | null
}

function envToEnvironment(value: string | undefined): MyDataEnvironment | 'mock' {
  const v = (value ?? 'sandbox').toLowerCase()
  if (v === 'production' || v === 'prod' || v === 'live') return 'production'
  if (v === 'mock' || v === 'demo') return 'mock'
  return 'sandbox' // 'test', 'dev', 'sandbox' and anything else default to safe
}

export async function resolveAadeConnection(userId: string): Promise<ResolvedAadeConnection> {
  const stored = await prisma.aadeConnection.findUnique({ where: { userId } })
  if (stored) {
    const environment = envToEnvironment(stored.environment)
    if (environment === 'mock') {
      return { source: 'mock', credentials: null, environment, entityVatNumber: stored.entityVatNumber, lastSyncedAt: stored.lastSyncedAt }
    }
    return {
      source: 'database',
      environment,
      entityVatNumber: stored.entityVatNumber,
      lastSyncedAt: stored.lastSyncedAt,
      credentials: {
        aadeUserId: decryptSecret(stored.aadeUserIdCipher),
        subscriptionKey: decryptSecret(stored.subscriptionKeyCipher),
        environment,
      },
    }
  }

  const environment = envToEnvironment(process.env.AADE_ENV)
  if (environment === 'mock') return { source: 'mock', credentials: null, environment }

  const aadeUserId = process.env.AADE_USER_ID
  const subscriptionKey = process.env.AADE_SUBSCRIPTION_KEY
  if (aadeUserId && subscriptionKey) {
    return { source: 'env', environment, credentials: { aadeUserId, subscriptionKey, environment } }
  }

  return { source: 'none', credentials: null, environment }
}

export type SaveConnectionInput = {
  aadeUserId: string
  subscriptionKey: string
  environment: string
  entityVatNumber?: string
}

export async function saveAadeConnection(userId: string, input: SaveConnectionInput): Promise<void> {
  const environment = envToEnvironment(input.environment)
  const data = {
    environment,
    entityVatNumber: input.entityVatNumber ?? null,
    aadeUserIdCipher: encryptSecret(input.aadeUserId),
    subscriptionKeyCipher: encryptSecret(input.subscriptionKey),
  }
  await prisma.aadeConnection.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  })
}

export async function deleteAadeConnection(userId: string): Promise<void> {
  await prisma.aadeConnection.deleteMany({ where: { userId } })
}

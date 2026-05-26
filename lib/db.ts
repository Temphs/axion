import { PrismaClient } from '@/lib/generated/prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

// libSQL works against a local SQLite file in dev and a remote Turso database in
// production (Vercel's filesystem is ephemeral, so a file-based DB can't be used there).
function createClient(): PrismaClient {
  const url = process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL ?? 'file:./dev.db'
  const authToken = process.env.TURSO_AUTH_TOKEN
  const adapter = new PrismaLibSql(authToken ? { url, authToken } : { url })
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

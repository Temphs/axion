import { prisma } from '@/lib/db'

// TEMPORARY diagnostic endpoint. Reports DB env wiring + a live ping. No secrets returned.
// Remove after debugging the Vercel/Turso connection.
export async function GET() {
  const url = process.env.TURSO_DATABASE_URL ?? null
  let host: string | null = null
  if (url) {
    try {
      host = new URL(url).host
    } catch {
      host = 'unparseable'
    }
  }

  const info: Record<string, unknown> = {
    hasTursoUrl: !!process.env.TURSO_DATABASE_URL,
    tursoUrlHost: host,
    hasTursoToken: !!process.env.TURSO_AUTH_TOKEN,
    tokenLength: process.env.TURSO_AUTH_TOKEN?.length ?? 0,
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    nodeEnv: process.env.NODE_ENV,
  }

  try {
    const r = await prisma.$queryRaw`SELECT 1 as ok`
    info.dbPing = 'ok'
    info.dbResult = r
  } catch (e) {
    info.dbPing = 'error'
    info.dbError = e instanceof Error ? e.message : String(e)
  }

  return Response.json(info)
}

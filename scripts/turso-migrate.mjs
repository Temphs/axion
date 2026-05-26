// Applies the Prisma migration SQL to a Turso (libSQL) database.
// Turso is SQLite, so the generated migration.sql files run as-is.
//   TURSO_DATABASE_URL="libsql://..." TURSO_AUTH_TOKEN="..." node scripts/turso-migrate.mjs
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@libsql/client'

const url = process.env.TURSO_DATABASE_URL
const authToken = process.env.TURSO_AUTH_TOKEN
if (!url) {
  console.error('Set TURSO_DATABASE_URL (and TURSO_AUTH_TOKEN) in the environment first.')
  process.exit(1)
}

const here = dirname(fileURLToPath(import.meta.url))
const migDir = join(here, '..', 'prisma', 'migrations')
const dirs = readdirSync(migDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort()

const client = createClient({ url, authToken })
for (const d of dirs) {
  const sql = readFileSync(join(migDir, d, 'migration.sql'), 'utf8')
  process.stdout.write(`applying ${d} ... `)
  await client.executeMultiple(sql)
  console.log('ok')
}
console.log(`\nAll ${dirs.length} migrations applied to ${url}`)

import "server-only"

import { connect } from "@tursodatabase/serverless"
import { getTursoEnv } from "./env"

// Lazy for the same reason as lib/s3.ts: connecting at module load made every
// build that merely imports this file require TURSO_AUTH_TOKEN, which a local
// file-backed dev database does not have.
type TursoClient = ReturnType<typeof connect>

let client: TursoClient | undefined

export function getTurso(): TursoClient {
  if (!client) {
    const { TURSO_DATABASE_URL, TURSO_AUTH_TOKEN } = getTursoEnv()
    client = connect({ url: TURSO_DATABASE_URL, authToken: TURSO_AUTH_TOKEN })
  }
  return client
}

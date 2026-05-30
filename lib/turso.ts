import "server-only"

import { createClient } from "@libsql/client"
import { getTursoEnv } from "./env"

const { TURSO_DATABASE_URL, TURSO_AUTH_TOKEN } = getTursoEnv()

export const turso = createClient({
  url: TURSO_DATABASE_URL,
  authToken: TURSO_AUTH_TOKEN,
})

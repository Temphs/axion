import "server-only"

import { connect } from "@tursodatabase/serverless"
import { getTursoEnv } from "./env"

const { TURSO_DATABASE_URL, TURSO_AUTH_TOKEN } = getTursoEnv()

export const turso = connect({
  url: TURSO_DATABASE_URL,
  authToken: TURSO_AUTH_TOKEN,
})

import "server-only"

type ServerEnv = {
  TURSO_DATABASE_URL: string
  TURSO_AUTH_TOKEN: string
  AWS_REGION: string
  S3_BUCKET_NAME: string
  AWS_ACCESS_KEY_ID: string
  AWS_SECRET_ACCESS_KEY: string
}

export function getServerEnv(): ServerEnv {
  const env: Partial<ServerEnv> = {
    TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL,
    TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN,
    AWS_REGION: process.env.AWS_REGION,
    S3_BUCKET_NAME: process.env.S3_BUCKET_NAME,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  }

  const missing = (Object.entries(env) as [keyof ServerEnv, string | undefined][])
    .filter(([, value]) => !value)
    .map(([key]) => key)

  if (missing.length > 0) {
    throw new Error(`Missing required server environment variables: ${missing.join(", ")}`)
  }

  return env as ServerEnv
}
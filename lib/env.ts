import "server-only"

function requireEnv(keys: string[]): Record<string, string> {
  const missing = keys.filter((k) => !process.env[k])
  if (missing.length > 0) {
    throw new Error(`Missing required server environment variables: ${missing.join(", ")}`)
  }
  return Object.fromEntries(keys.map((k) => [k, process.env[k] as string]))
}

export function getTursoEnv() {
  const env = requireEnv(["TURSO_DATABASE_URL", "TURSO_AUTH_TOKEN"])
  return {
    TURSO_DATABASE_URL: env.TURSO_DATABASE_URL,
    TURSO_AUTH_TOKEN: env.TURSO_AUTH_TOKEN,
  }
}

export function getAwsEnv() {
  const env = requireEnv(["AWS_REGION", "S3_BUCKET_NAME", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"])
  return {
    AWS_REGION: env.AWS_REGION,
    S3_BUCKET_NAME: env.S3_BUCKET_NAME,
    AWS_ACCESS_KEY_ID: env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: env.AWS_SECRET_ACCESS_KEY,
  }
}

import "server-only"

import { S3Client } from "@aws-sdk/client-s3"
import { getAwsEnv } from "./env"

// Built on first use rather than at module load. Constructing it at import time
// meant every build — including one for a deployment that only runs MyEmployee
// and never touches invoice uploads — failed at "collecting page data" unless
// AWS_* were set. The credentials are now only required when an upload is
// actually requested.
let client: S3Client | undefined

export function getS3(): S3Client {
  if (!client) {
    const { AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY } = getAwsEnv()
    client = new S3Client({
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
      },
    })
  }
  return client
}

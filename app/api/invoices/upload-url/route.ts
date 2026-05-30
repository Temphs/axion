import { NextRequest, NextResponse } from "next/server"
import { PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { randomUUID } from "crypto"

import { s3 } from "@/lib/s3"
import { turso } from "@/lib/turso"
import { getAwsEnv } from "@/lib/env"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { filename, contentType, fileSize } = body

    if (!filename || !contentType || fileSize == null) {
      return NextResponse.json({ error: "filename, contentType, and fileSize are required" }, { status: 400 })
    }
    if (contentType !== "application/pdf") {
      return NextResponse.json({ error: "Only application/pdf is accepted" }, { status: 400 })
    }
    if (typeof fileSize !== "number" || fileSize <= 0 || fileSize > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "fileSize must be a positive number up to 10 MB" }, { status: 400 })
    }

    // TODO: Replace mock auth with real session/auth logic before going to production.
    // Read the authenticated user from the session (e.g. via next-auth or a custom session cookie).
    const userId = "user_demo_1"
    const companyId = "company_demo_1"

    const invoiceId = randomUUID()
    const now = new Date()
    const year = now.getUTCFullYear()
    const month = String(now.getUTCMonth() + 1).padStart(2, "0")
    const s3Key = `invoices/${companyId}/${year}/${month}/${invoiceId}.pdf`

    const { S3_BUCKET_NAME } = getAwsEnv()

    await turso.execute({
      sql: `INSERT INTO invoices
              (id, company_id, uploaded_by, s3_bucket, s3_key, original_filename, content_type, file_size_bytes, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [invoiceId, companyId, userId, S3_BUCKET_NAME, s3Key, filename, contentType, fileSize, "uploaded"],
    })

    await turso.execute({
      sql: `INSERT INTO audit_logs
              (id, company_id, user_id, action, entity_type, entity_id)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [randomUUID(), companyId, userId, "invoice_upload_url_created", "invoice", invoiceId],
    })

    const command = new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: s3Key,
      ContentType: contentType,
    })

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 })

    return NextResponse.json({ invoiceId, s3Key, uploadUrl })
  } catch (error) {
    console.error("Failed to create invoice upload URL", error)
    return NextResponse.json({ error: "Could not create invoice upload URL" }, { status: 500 })
  }
}

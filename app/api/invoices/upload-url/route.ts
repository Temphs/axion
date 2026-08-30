import { NextRequest, NextResponse } from "next/server"
import { PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { randomUUID } from "crypto"

import { getS3 } from "@/lib/s3"
import { getTurso } from "@/lib/turso"
import { getAwsEnv } from "@/lib/env"
import { getCurrentUser } from "@/lib/auth"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

export async function POST(req: NextRequest) {
  console.log("Upload URL route started")

  try {
    // Require an authenticated session before issuing a presigned upload URL or
    // writing any DB rows — this endpoint must never be reachable anonymously.
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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

    console.log("Request body validated", { filename, contentType, fileSize })

    // Scope the upload to the authenticated user. There is no separate company
    // entity yet, so the user's id namespaces their invoices.
    const userId = user.id
    const companyId = user.id

    const invoiceId = randomUUID()
    const now = new Date()
    const year = now.getUTCFullYear()
    const month = String(now.getUTCMonth() + 1).padStart(2, "0")
    const s3Key = `invoices/${companyId}/${year}/${month}/${invoiceId}.pdf`

    console.log("IDs and S3 key generated", { invoiceId, s3Key, companyId })

    const { S3_BUCKET_NAME } = getAwsEnv()

    console.log("Creating invoice row in Turso")
    await getTurso().execute(
      `INSERT INTO invoices
         (id, company_id, uploaded_by, s3_bucket, s3_key, original_filename, content_type, file_size_bytes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [invoiceId, companyId, userId, S3_BUCKET_NAME, s3Key, filename, contentType, fileSize, "uploaded"],
    )

    console.log("Creating audit log row in Turso")
    await getTurso().execute(
      `INSERT INTO audit_logs
         (id, company_id, user_id, action, entity_type, entity_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [randomUUID(), companyId, userId, "invoice_upload_url_created", "invoice", invoiceId],
    )

    console.log("Generating S3 pre-signed URL")
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: s3Key,
      ContentType: contentType,
    })

    const uploadUrl = await getSignedUrl(getS3(), command, { expiresIn: 300 })

    console.log("Upload URL created successfully", { invoiceId, s3Key })
    return NextResponse.json({ invoiceId, s3Key, uploadUrl })
  } catch (error) {
    console.error("Failed to create invoice upload URL", {
      message: error instanceof Error ? error.message : "Unknown error",
      name: error instanceof Error ? error.name : "UnknownError",
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json({ error: "Could not create invoice upload URL" }, { status: 500 })
  }
}

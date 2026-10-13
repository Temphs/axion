import 'server-only'

// Transactional email via Resend's HTTP API (no SDK dependency). Configure
// RESEND_API_KEY and EMAIL_FROM. Without them, development logs the message
// to the server console so flows can be tested locally. Production never
// does that, because the body carries a password-reset link.

export type Email = { to: string; subject: string; text: string; html: string }

export async function sendEmail(email: Email): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM

  if (!apiKey || !from) {
    if (process.env.NODE_ENV !== 'production') {
      console.info(`[email:dev] to=${email.to} subject="${email.subject}"\n${email.text}`)
      return true
    }
    console.error('Email not sent: RESEND_API_KEY / EMAIL_FROM are not configured')
    return false
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [email.to], subject: email.subject, text: email.text, html: email.html }),
    })
    if (!res.ok) {
      // Status only: the provider's error body can echo the recipient address.
      console.error(`Email provider rejected the message (HTTP ${res.status})`)
      return false
    }
    return true
  } catch (err) {
    console.error('Email provider unreachable', err instanceof Error ? err.name : 'UnknownError')
    return false
  }
}

// Public base URL for links in emails. Never derived from the request's Host
// header, which an attacker controls ("password reset poisoning").
export function appBaseUrl(): string | null {
  const configured = process.env.APP_URL?.trim().replace(/\/+$/, '')
  if (configured) return configured
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  if (process.env.NODE_ENV !== 'production') return 'http://localhost:3000'
  return null
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

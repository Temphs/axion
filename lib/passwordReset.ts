import 'server-only'
import { randomBytes } from 'node:crypto'
import { prisma } from '@/lib/db'
import { hashApiKey, hashPassword } from '@/lib/auth'
import { appBaseUrl, escapeHtml, sendEmail } from '@/lib/email'

const TOKEN_TTL_MS = 30 * 60_000

// Same primitive as API keys: a 256-bit random token only needs a fast hash.
const hashToken = hashApiKey

// Issues a reset link for the account with this email, if there is one, and
// emails it. Silent when there is no such account: the caller answers the
// same way either way, so the endpoint can't be used to probe for accounts.
export async function requestPasswordReset(email: string, lang: 'el' | 'en'): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, name: true } })
  if (!user) return

  const base = appBaseUrl()
  if (!base) {
    console.error('Password reset not sent: set APP_URL to the public URL of the app')
    return
  }

  const token = randomBytes(32).toString('base64url')
  // Only the newest link works: requesting again invalidates the older ones.
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
    prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + TOKEN_TTL_MS) },
    }),
  ])

  const link = `${base}/${lang}/reset-password?token=${token}`
  await sendEmail({ to: user.email, ...resetEmail(link, user.name, lang) })
}

export type ResetResult = { ok: true } | { ok: false; error: 'invalid_token' }

// Sets a new password if the token is valid, unused and unexpired, then burns
// every reset token and signs out every session of that account.
export async function resetPassword(token: string, newPassword: string): Promise<ResetResult> {
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } })
  if (!record || record.usedAt || record.expiresAt < new Date()) return { ok: false, error: 'invalid_token' }

  const passwordHash = await hashPassword(newPassword)
  // Claiming the token with `usedAt: null` in the filter means two concurrent
  // requests can't both use it: only one update matches.
  const claimed = await prisma.passwordResetToken.updateMany({
    where: { id: record.id, usedAt: null },
    data: { usedAt: new Date() },
  })
  if (claimed.count !== 1) return { ok: false, error: 'invalid_token' }

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.deleteMany({ where: { userId: record.userId } }),
    prisma.session.deleteMany({ where: { userId: record.userId } }),
  ])
  return { ok: true }
}

function resetEmail(link: string, name: string | null, lang: 'el' | 'en') {
  const t =
    lang === 'el'
      ? {
          subject: 'Επαναφορά κωδικού Axion',
          hello: name ? `Γεια σας ${name},` : 'Γεια σας,',
          body: 'Ζητήθηκε επαναφορά του κωδικού για τον λογαριασμό σας στην Axion. Ο σύνδεσμος ισχύει για 30 λεπτά και μπορεί να χρησιμοποιηθεί μία φορά.',
          cta: 'Ορισμός νέου κωδικού',
          ignore: 'Αν δεν το ζητήσατε εσείς, αγνοήστε αυτό το μήνυμα — ο κωδικός σας δεν αλλάζει.',
        }
      : {
          subject: 'Reset your Axion password',
          hello: name ? `Hi ${name},` : 'Hi,',
          body: 'Someone asked to reset the password for your Axion account. The link works for 30 minutes and only once.',
          cta: 'Choose a new password',
          ignore: "If this wasn't you, ignore this email — your password stays the same.",
        }

  const text = `${t.hello}\n\n${t.body}\n\n${t.cta}: ${link}\n\n${t.ignore}\n`
  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#0f172a;max-width:520px">
<p>${escapeHtml(t.hello)}</p>
<p>${escapeHtml(t.body)}</p>
<p><a href="${escapeHtml(link)}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 18px;border-radius:10px;font-weight:600">${escapeHtml(t.cta)}</a></p>
<p style="color:#64748b;font-size:13px">${escapeHtml(t.ignore)}</p>
</div>`
  return { subject: t.subject, text, html }
}

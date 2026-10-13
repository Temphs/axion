import type { Metadata } from 'next'
import { Card } from '@/components/axion/ui'
import { ResetPasswordForm } from '@/components/axion/PasswordResetForms'

// The reset token is in the URL: never send it on as a Referer.
export const metadata: Metadata = { referrer: 'no-referrer', robots: { index: false } }

export default async function ResetPasswordPage({ params, searchParams }: PageProps<'/[lang]/reset-password'>) {
  const { lang } = await params
  const { token } = await searchParams
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-blue-50/40 px-4 py-12">
      <Card className="w-full max-w-md p-8">
        <ResetPasswordForm lang={lang} token={typeof token === 'string' ? token : ''} />
      </Card>
    </main>
  )
}

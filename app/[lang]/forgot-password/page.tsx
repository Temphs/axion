import { Card } from '@/components/axion/ui'
import { ForgotPasswordForm } from '@/components/axion/PasswordResetForms'

export default async function ForgotPasswordPage({ params }: PageProps<'/[lang]/forgot-password'>) {
  const { lang } = await params
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-blue-50/40 px-4 py-12">
      <Card className="w-full max-w-md p-8">
        <ForgotPasswordForm lang={lang} />
      </Card>
    </main>
  )
}

import { Card } from '@/components/axion/ui'
import { AuthForm } from '@/components/axion/AuthForm'

export default async function LoginPage({ params }: PageProps<'/[lang]/login'>) {
  const { lang } = await params
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-blue-50/40 px-4 py-12">
      <Card className="w-full max-w-md p-8">
        <AuthForm lang={lang} />
      </Card>
    </main>
  )
}

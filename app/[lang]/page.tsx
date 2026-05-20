import { notFound } from 'next/navigation'
import { AxionLanding } from '@/components/axion/AxionLanding'
import { I18nProvider } from '@/components/axion/i18n'
import { getDictionary } from '@/lib/dictionaries'
import { hasLocale } from '@/lib/i18n'

export default async function Home({ params }: PageProps<'/[lang]'>) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()

  const dict = getDictionary(lang)

  return (
    <I18nProvider lang={lang} dict={dict}>
      <AxionLanding />
    </I18nProvider>
  )
}

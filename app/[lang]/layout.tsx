import type { Metadata } from 'next'
import { Inter, Manrope } from 'next/font/google'
import { notFound } from 'next/navigation'
import '../globals.css'
import { defaultLocale, hasLocale, locales } from '@/lib/i18n'
import { getDictionary } from '@/lib/dictionaries'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
})

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>
}): Promise<Metadata> {
  const { lang } = await params
  const dict = getDictionary(hasLocale(lang) ? lang : defaultLocale)
  return {
    title: dict.meta.title,
    description: dict.meta.description,
    openGraph: {
      type: 'website',
      locale: lang === 'el' ? 'el_GR' : 'en_US',
      siteName: 'Axion',
      title: dict.meta.title,
      description: dict.meta.description,
    },
  }
}

export default async function RootLayout({
  children,
  params,
}: LayoutProps<'/[lang]'>) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()

  return (
    <html lang={lang} className={`${inter.variable} ${manrope.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  )
}

import type { Metadata } from 'next'
import { Inter, Manrope } from 'next/font/google'
import './globals.css'

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

export const metadata: Metadata = {
  title: 'Axion — Financial Intelligence for Modern Businesses',
  description:
    'Predict VAT liabilities, analyze business performance, and track employee profitability in one intelligent platform. Built for accounting firms and SMEs.',
  keywords: ['VAT prediction', 'financial analytics', 'employee profitability', 'accounting', 'MyData', 'AADE'],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Axion',
    title: 'Axion — Financial Intelligence for Modern Businesses',
    description:
      'Predict VAT liabilities, analyze business performance, and track employee profitability in one intelligent platform.',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${manrope.variable}`}>
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}

import type { Metadata } from 'next'
import { DM_Sans, DM_Mono, Syne } from 'next/font/google'
import './globals.css'

const body = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['300', '400', '500', '600'],
})

const display = Syne({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '600', '700', '800'],
})

const mono = DM_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['300', '400', '500'],
})

export const metadata: Metadata = {
  title: 'CS Dashboard',
  description: 'Customer Service KPI Dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${body.variable} ${display.variable} ${mono.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  )
}

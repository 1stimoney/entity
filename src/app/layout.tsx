import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { Navbar } from '@/components/Navbar'
import Script from 'next/script'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata = {
  title: 'Entity',
  description: 'Secure online investments powered by Paystack',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang='en'>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-5000 text-gray-900`}
      >
        <Navbar />
        <main className='min-h-screen p-6'>{children}</main>
        <Script
          src='https://checkout.flutterwave.com/v3.js'
          strategy='afterInteractive'
        />
      </body>
    </html>
  )
}

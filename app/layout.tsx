import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { AppChrome } from '@/components/domain/AppChrome'
import { ToastProvider } from '@/components/ui/toast'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const themeBootstrap = `(function(){try{var t=localStorage.getItem('attivus-theme');var d=t==='dark';var r=document.documentElement;r.classList.toggle('dark',d);r.classList.toggle('light',!d);}catch(e){}})();`

export const metadata: Metadata = {
  title: 'Catálogo Attivus',
  description: 'Catálogo digital para vendedores externos de material de construção.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  themeColor: '#6B3FA0',
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} light`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className="font-sans antialiased">
        <ToastProvider>
          <AppChrome>{children}</AppChrome>
        </ToastProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}

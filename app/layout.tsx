import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: 'FocusHub - Virtual Study Rooms & Pomodoro Timer',
    template: '%s | FocusHub',
  },
  description: 'Boost your productivity with virtual study rooms, Pomodoro timer, and real-time collaboration. Track your progress with detailed analytics and gamification.',
  keywords: ['study rooms', 'pomodoro timer', 'productivity', 'focus', 'study together', 'virtual study'],
  authors: [{ name: 'FocusHub Team' }],
  creator: 'FocusHub',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'FocusHub',
    title: 'FocusHub - Virtual Study Rooms & Pomodoro Timer',
    description: 'Boost your productivity with virtual study rooms and Pomodoro timer.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FocusHub - Virtual Study Rooms & Pomodoro Timer',
    description: 'Boost your productivity with virtual study rooms and Pomodoro timer.',
  },
  icons: {
    icon: '/gemini-svg.svg',
    shortcut: '/gemini-svg.svg',
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0c0a14' },
  ],
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className="font-sans antialiased min-h-screen bg-background text-foreground"
        suppressHydrationWarning
      >
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}

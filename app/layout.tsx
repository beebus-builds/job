import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'jobOS — The operating system for getting hired',
  description: 'AI-powered hiring and job search automation for candidates and employers.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>
}

import './globals.css'
import { AuthProvider } from '@/lib/auth'

export const metadata = {
  title: 'SolarFlow OS',
  description: 'Solar installation workflow platform — manage permits, net-metering, contractors and milestones in one place.',
  manifest: '/manifest.json',
}

export const viewport = {
  themeColor: '#16324F',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}

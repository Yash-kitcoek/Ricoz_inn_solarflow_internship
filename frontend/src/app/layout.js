import './globals.css'
import { AuthProvider } from '@/lib/auth'
export const metadata = { title: 'SolarFlow OS', description: 'Solar installation workflow platform' }
export default function RootLayout({ children }) { return <html lang="en"><body><AuthProvider>{children}</AuthProvider></body></html> }

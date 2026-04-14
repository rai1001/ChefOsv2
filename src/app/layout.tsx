import type { Metadata } from 'next'
import { Providers } from './providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'ChefOS',
  description: 'Control operativo de cocina multi-servicio',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className="dark">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

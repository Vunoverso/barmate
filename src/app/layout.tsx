
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ClientLayout } from '@/components/layout/client-layout';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'BarMate - Gestão Inteligente para Bares e Restaurantes',
    template: '%s | BarMate'
  },
  description: 'O sistema de PDV mais ágil do mercado. Comandas em tempo real, controle de caixa, monitor de cozinha e gestão SaaS completa.',
  keywords: ['gestão de bar', 'sistema para restaurante', 'comanda digital', 'pdv bar', 'barmate'],
  authors: [{ name: 'BarMate Team' }],
  robots: 'index, follow',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icon.svg?v=2', type: 'image/svg+xml' },
      { url: '/favicon.svg?v=2', type: 'image/svg+xml' },
      { url: '/icon-192.svg?v=2', sizes: '192x192', type: 'image/svg+xml' },
      { url: '/icon-512.svg?v=2', sizes: '512x512', type: 'image/svg+xml' },
    ],
    shortcut: ['/icon.svg?v=2'],
    apple: [{ url: '/apple-icon.svg?v=2', sizes: '180x180', type: 'image/svg+xml' }],
  },
  appleWebApp: {
    capable: true,
    title: 'BarMate',
    statusBarStyle: 'default',
  },
};

export const viewport: Viewport = {
  themeColor: '#3F51B5',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`} suppressHydrationWarning>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}

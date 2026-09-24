import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/lib/auth';
import { RouteGuard } from '@/components/auth/route-guard';
import { QueryProvider } from '@/lib/query-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://zylo.rocks'),
  title: {
    default: 'Zylo — Live Bolder | Live Streaming & Creator Platform',
    template: '%s | Zylo — Live Bolder',
  },
  description: 'Experience sub-second live streaming, interactive chat, virtual creator gifting, and real-time community experiences on Zylo. Live Bolder.',
  keywords: [
    'Zylo',
    'Live Bolder',
    'Live Streaming',
    'WebRTC Streaming',
    'Creator Platform',
    'Virtual Gifts',
    'Live Chat',
    'Gaming Streams',
    'IRL Streams',
    'Creator Studio',
  ],
  authors: [{ name: 'Zylo Team' }],
  creator: 'Zylo Platform',
  publisher: 'Zylo',
  themeColor: '#7c3aed',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/favicon/favicon.ico' },
      { url: '/favicon/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/favicon/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/favicon/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: ['/favicon/favicon.ico'],
  },
  manifest: '/favicon/site.webmanifest',
  openGraph: {
    title: 'Zylo — Live Bolder | Next-Gen Live Streaming Platform',
    description: 'Experience sub-second live streaming, interactive chat, creator gifting, and real-time community experiences on Zylo.',
    url: 'https://zylo.rocks',
    siteName: 'Zylo',
    images: [
      {
        url: '/zylo-logo.png',
        width: 1200,
        height: 630,
        alt: 'Zylo — Live Bolder',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Zylo — Live Bolder',
    description: 'Experience sub-second live streaming, interactive chat, creator gifting, and real-time community experiences on Zylo.',
    creator: '@zylo_live',
    images: ['/zylo-logo.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryProvider>
          <AuthProvider>
            <RouteGuard>{children}</RouteGuard>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans, Caveat } from 'next/font/google'
import { ConditionalHeader, ConditionalFooter, ConditionalChatbot } from '@/components/conditional-chrome'
import { ScrollToTop } from '@/components/scroll-to-top'
import './globals.css'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
})

const caveat = Caveat({
  subsets: ['latin'],
  variable: '--font-caveat',
  display: 'swap',
})

const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL
    ? process.env.NEXT_PUBLIC_SITE_URL
    : process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000'
).replace(/\/+$/, '')

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Jejkowice — nasza gmina! | Nieoficjalny serwis mieszkańców',
    template: '%s | Jejkowice — nasza gmina!',
  },
  description:
    'Nieoficjalny serwis dla mieszkańców i fanów Jejkowic. Aktualności, wydarzenia, harmonogram wywozu śmieci, zgłaszanie spraw, ankiety i galeria mieszkańców.',
  applicationName: 'Jejkowice — nasza gmina!',
  generator: 'v0.app',
  keywords: [
    'Jejkowice',
    'gmina Jejkowice',
    'powiat rybnicki',
    'wywóz śmieci Jejkowice',
    'harmonogram odbioru odpadów',
    'aktualności Jejkowice',
    'wydarzenia Jejkowice',
    'zgłoszenia mieszkańców',
    'serwis mieszkańców',
  ],
  authors: [{ name: 'Jejkowice — nasza gmina!' }],
  creator: 'Jejkowice — nasza gmina!',
  publisher: 'Jejkowice — nasza gmina!',
  category: 'Serwis lokalny',
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  openGraph: {
    title: 'Jejkowice — nasza gmina!',
    description:
      'Nieoficjalny serwis dla mieszkańców i fanów Jejkowic — wszystko, co ważne dla naszej społeczności.',
    url: '/',
    siteName: 'Jejkowice — nasza gmina!',
    locale: 'pl_PL',
    type: 'website',
    images: [
      {
        url: '/og-image-v2.jpg',
        width: 1200,
        height: 630,
        type: 'image/jpeg',
        alt: 'Jejkowice — nasza gmina! Wszystko, co ważne w naszej gminie, blisko Ciebie.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Jejkowice — nasza gmina!',
    description:
      'Nieoficjalny serwis dla mieszkańców i fanów Jejkowic — wszystko, co ważne dla naszej społeczności.',
    images: ['/og-image-v2.jpg'],
  },
}

export const viewport: Viewport = {
  themeColor: '#f4f6fb',
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        url: siteUrl,
        name: 'Jejkowice — nasza gmina!',
        description:
          'Nieoficjalny serwis dla mieszkańców i fanów Jejkowic. Aktualności, wydarzenia, harmonogram wywozu śmieci, zgłaszanie spraw, ankiety i galeria mieszkańców.',
        inLanguage: 'pl-PL',
        publisher: { '@id': `${siteUrl}/#organization` },
      },
      {
        '@type': 'Organization',
        '@id': `${siteUrl}/#organization`,
        name: 'Jejkowice — nasza gmina!',
        url: siteUrl,
        logo: `${siteUrl}/icon.svg`,
        image: `${siteUrl}/og-image-v2.jpg`,
        description:
          'Nieoficjalny serwis społecznościowy dla mieszkańców i fanów Jejkowic w powiecie rybnickim.',
        areaServed: {
          '@type': 'Place',
          name: 'Jejkowice, powiat rybnicki, Polska',
        },
      },
    ],
  }

  return (
    <html lang="pl" className={`${jakarta.variable} ${caveat.variable} overflow-x-hidden bg-background`}>
      <body className="flex min-h-svh flex-col font-sans antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <ScrollToTop />
        <ConditionalHeader />
        <main className="min-h-[60vh] flex-1">{children}</main>
        <ConditionalFooter />
        <ConditionalChatbot />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}

import type { MetadataRoute } from 'next'

const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL
    ? process.env.NEXT_PUBLIC_SITE_URL
    : process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000'
).replace(/\/+$/, '')

// Boty AI, które ma sens jawnie dopuścić — dzięki temu treść serwisu może
// trafiać do odpowiedzi ChatGPT, Perplexity, Claude, Gemini itd.
const aiBots = [
  'GPTBot', // OpenAI (trenowanie)
  'OAI-SearchBot', // ChatGPT Search
  'ChatGPT-User', // ChatGPT (przeglądanie na żądanie)
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended', // Gemini / Vertex
  'ClaudeBot',
  'Claude-Web',
  'Applebot-Extended',
  'CCBot', // Common Crawl (zasila wiele modeli)
]

export default function robots(): MetadataRoute.Robots {
  const disallow = ['/admin', '/admin/', '/auth/']

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow,
      },
      // Jawne dopuszczenie crawlerów AI do treści publicznej.
      {
        userAgent: aiBots,
        allow: '/',
        disallow,
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}

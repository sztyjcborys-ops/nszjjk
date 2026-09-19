import type { MetadataRoute } from 'next'
import { getPublishedArticles } from '@/lib/articles'
import { getPublicEvents } from '@/lib/events'

const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL
    ? process.env.NEXT_PUBLIC_SITE_URL
    : process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000'
).replace(/\/+$/, '')

// Odświeżaj sitemap co 5 min (nowe artykuły/wydarzenia pojawią się automatycznie).
export const revalidate = 300

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const staticRoutes: {
    path: string
    priority: number
    changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']
  }[] = [
    { path: '/', priority: 1, changeFrequency: 'daily' },
    { path: '/aktualnosci', priority: 0.9, changeFrequency: 'daily' },
    { path: '/wydarzenia', priority: 0.8, changeFrequency: 'weekly' },
    { path: '/wywoz-smieci', priority: 0.8, changeFrequency: 'weekly' },
    { path: '/zglos-sprawe', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/ankiety', priority: 0.6, changeFrequency: 'weekly' },
    { path: '/pomysly', priority: 0.6, changeFrequency: 'weekly' },
  ]

  const entries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${siteUrl}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }))

  // Dynamiczne strony artykułów i wydarzeń. Pobieramy je bezpiecznie —
  // gdyby baza była chwilowo niedostępna, sitemap wciąż zwróci strony statyczne.
  try {
    const [articles, events] = await Promise.all([
      getPublishedArticles().catch(() => []),
      getPublicEvents().catch(() => []),
    ])

    for (const a of articles) {
      entries.push({
        url: `${siteUrl}/aktualnosci/${a.slug}`,
        lastModified: a.updated_at ? new Date(a.updated_at) : now,
        changeFrequency: 'weekly',
        priority: 0.7,
      })
    }

    for (const e of events) {
      // W EventItem pole `id` przechowuje slug wykorzystywany w adresie URL.
      entries.push({
        url: `${siteUrl}/wydarzenia/${e.id}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.6,
      })
    }
  } catch (error) {
    console.log('[v0] sitemap dynamic entries error:', (error as Error).message)
  }

  return entries
}

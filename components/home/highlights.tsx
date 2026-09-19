import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getPublicEvents } from '@/lib/events'
import { getPublishedArticles, articleToNewsItem } from '@/lib/articles'
import { NewsWideCard } from '@/components/shared/news-card'
import { EventsCarousel } from '@/components/home/events-carousel'
import { EventsHerbWatermark } from '@/components/home/events-herb-watermark'
import { SectionTitle } from '@/components/shared/section-title'

export async function Highlights() {
  const [articles, events] = await Promise.all([getPublishedArticles(), getPublicEvents()])
  const latestNews = articles.slice(0, 3).map(articleToNewsItem)

  return (
    <>
      <section className="mx-auto max-w-6xl px-4 md:px-6">
        <SectionTitle
          title="Co nowego w Jejkowicach?"
          action={{ href: '/aktualnosci', label: 'Zobacz wszystkie' }}
        />
        {latestNews.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
            Nie ma jeszcze żadnych aktualności.
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {latestNews.map((item) => (
              <NewsWideCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>

      {/* Pasek wydarzeń na całą szerokość ekranu — tło obejmuje całą sekcję.
          Delikatne zaokrąglenie górnych rogów daje subtelne wejście do sekcji. */}
      <section className="relative overflow-hidden rounded-t-2xl bg-navy py-10 md:rounded-t-3xl md:py-14">
        {/* Herb gminy Jejkowice jako delikatny złoty znak wodny w prawym górnym rogu. */}
        <EventsHerbWatermark />
        <div className="relative mx-auto max-w-6xl px-4 md:px-6">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-pretty text-xl font-bold tracking-tight text-navy-foreground md:text-3xl">
                Nadchodzące wydarzenia
              </h2>
              <p className="mt-1 font-script text-xl leading-none text-gold/70 md:text-2xl">
                Sprawdź, co czeka na Ciebie w najbliższych dniach.
              </p>
            </div>
            <Link
              href="/wydarzenia"
              prefetch={false}
              className="flex shrink-0 items-center gap-1 text-sm font-semibold text-navy-foreground hover:underline"
            >
              Kalendarz
              <ArrowRight className="size-4" />
            </Link>
          </div>
          <EventsCarousel items={events.slice(0, 6)} />
          <p className="mx-auto mt-8 max-w-md text-balance text-center text-sm text-navy-foreground/70">
            Nie przegap tego, co dzieje się blisko Ciebie. Sprawdź pełny kalendarz wydarzeń.
          </p>
          <Link
            href="/wydarzenia"
            prefetch={false}
            className="mx-auto mt-3 flex max-w-md items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Zobacz pełny kalendarz
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </>
  )
}

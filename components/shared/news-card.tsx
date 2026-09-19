import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import type { NewsItem } from '@/lib/data'
import { CategoryBadge } from '@/components/shared/badges'

export function NewsCard({ item }: { item: NewsItem }) {
  return (
    <Link
      href={`/aktualnosci/${item.id}`}
      prefetch={false}
      className="group block overflow-hidden rounded-3xl border border-border bg-card transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <article className="block">
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-t-3xl">
          <Image
            src={item.image || '/placeholder.svg'}
            alt={item.title}
            fill
            sizes="(min-width: 1024px) 22rem, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute left-3 top-3">
            <CategoryBadge category={item.category} />
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-5">
          <h3 className="text-base font-bold leading-snug text-balance sm:text-xl">{item.title}</h3>
          <div className="mt-2 flex items-center justify-between gap-2 sm:mt-3">
            <time className="text-xs text-muted-foreground">{item.date}</time>
            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary">
              Czytaj więcej
              <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
          </div>
        </div>
      </article>
    </Link>
  )
}

export function NewsWideCard({ item }: { item: NewsItem }) {
  return (
    <Link
      href={`/aktualnosci/${item.id}`}
      prefetch={false}
      className="group relative flex h-40 overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:h-44"
    >
      {/* Photo pinned to the right edge — sits slightly further left so more of
          it stays visible, while the text layer above fades over its left side. */}
      <div className="absolute inset-y-0 right-0 w-[52%] overflow-hidden">
        <Image
          src={item.image || '/placeholder.svg'}
          alt={item.title}
          fill
          sizes="(min-width: 640px) 320px, 50vw"
          // Kadr miniaturki ustawiany w panelu admina (zapisany przy zdjęciu).
          style={{ objectPosition: item.imagePosition ?? '50% 50%' }}
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="pointer-events-none absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-card via-card/80 to-transparent" />
      </div>

      {/* Text layer is wider than the remaining space, so long headlines can
          run over the faded part of the photo instead of being clipped. */}
      <div className="relative z-10 flex w-[68%] min-w-0 flex-col justify-between p-3 sm:w-[64%] sm:p-4">
        <div>
          <CategoryBadge category={item.category} size="sm" />
        </div>
        <h3 className="line-clamp-3 text-sm font-bold leading-snug text-pretty sm:text-[0.95rem]">
          {item.title}
        </h3>
        <time className="text-[0.7rem] text-muted-foreground">{item.date}</time>
      </div>

      {/* Sygnał klikalności w prawym dolnym rogu kafelka. */}
      <span
        aria-hidden="true"
        className="absolute bottom-2.5 right-2.5 z-10 flex size-7 items-center justify-center rounded-full bg-card/90 text-primary shadow-sm backdrop-blur-sm transition-transform group-hover:translate-x-0.5"
      >
        <ArrowRight className="size-4" />
      </span>
    </Link>
  )
}

export function NewsRow({ item }: { item: NewsItem }) {
  return (
    <article className="flex items-center gap-3 rounded-2xl border border-border bg-card p-2.5 transition-shadow hover:shadow-sm">
      <div className="relative size-16 shrink-0 overflow-hidden rounded-xl">
        <Image
          src={item.image || '/placeholder.svg'}
          alt={item.title}
          fill
          sizes="64px"
          className="object-cover"
        />
      </div>
      <div className="min-w-0 flex-1">
        <span className="text-[0.65rem] font-bold uppercase tracking-wide text-primary">
          {item.category}
        </span>
        <h3 className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug text-balance">
          {item.title}
        </h3>
        <time className="mt-1 block text-[0.7rem] text-muted-foreground">{item.date}</time>
      </div>
    </article>
  )
}

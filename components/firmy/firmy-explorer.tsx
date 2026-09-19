'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Star, MapPin, Phone, Tag, ArrowRight } from 'lucide-react'
import type { LocalBusiness } from '@/lib/local-businesses'
import { businessCategories } from '@/lib/local-businesses'
import { StoryViewer } from './story-viewer'
import { SampleBadge } from '@/components/shared/sample-badge'
import { useViewedStories } from '@/hooks/use-viewed-stories'

/** Obwódka obejrzanej relacji jest szara (jak na Instagramie). */
const VIEWED_RING = 'ring-muted-foreground/40'

const badgeTone: Record<LocalBusiness['badgeTone'], string> = {
  red: 'bg-destructive text-white',
  eco: 'bg-eco text-eco-foreground',
  gold: 'bg-gold text-gold-foreground',
  primary: 'bg-primary text-primary-foreground',
}

/**
 * Interaktywny moduł podstrony „Lokalne firmy":
 *  • pasek relacji (rolek) firm — klik otwiera pełnoekranową przeglądarkę,
 *  • filtry kategorii,
 *  • siatka polecanych ofert,
 *  • katalog firm z akcjami kontaktu.
 */
export function FirmyExplorer({ businesses }: { businesses: LocalBusiness[] }) {
  const [category, setCategory] = useState<string>('Wszystko')
  const [storyStart, setStoryStart] = useState<number | null>(null)
  const { isViewed } = useViewedStories()

  // Kolejność firm z relacjami — używana przez przeglądarkę relacji.
  const withStories = useMemo(
    () => businesses.filter((b) => (b.stories?.length ?? 0) > 0),
    [businesses],
  )

  const filtered = useMemo(
    () =>
      category === 'Wszystko'
        ? businesses
        : businesses.filter((b) => b.category === category),
    [businesses, category],
  )

  const openStory = (bizId: string) => {
    const idx = withStories.findIndex((b) => b.id === bizId)
    if (idx >= 0) setStoryStart(idx)
  }

  return (
    <div className="flex flex-col gap-10">
      {/* Pasek relacji */}
      <section aria-label="Relacje lokalnych firm">
        <ul className="flex gap-4 overflow-x-auto px-1 pb-3 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {withStories.map((biz) => (
            <li key={biz.id} className="shrink-0">
              <button
                type="button"
                onClick={() => openStory(biz.id)}
                className="flex w-16 flex-col items-center gap-1.5 text-center outline-none"
              >
                <span
                  className={`relative size-16 overflow-hidden rounded-full ring-2 ring-offset-2 ring-offset-background transition-transform hover:scale-105 ${
                    isViewed(biz.id) ? VIEWED_RING : biz.ring
                  }`}
                >
                  <Image src={biz.image} alt="" fill sizes="64px" className="object-cover" />
                </span>
                <span className="line-clamp-2 text-xs font-medium leading-tight text-foreground text-pretty">
                  {biz.shortName}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Filtry kategorii */}
      <section aria-label="Filtry kategorii" className="-mt-4">
        <ul className="flex flex-wrap gap-2">
          {businessCategories.map((cat) => {
            const active = cat === category
            return (
              <li key={cat}>
                <button
                  type="button"
                  onClick={() => setCategory(cat)}
                  aria-pressed={active}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground'
                  }`}
                >
                  {cat}
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      {/* Polecane oferty */}
      <section aria-labelledby="oferty-title">
        <h2 id="oferty-title" className="mb-4 text-xl font-bold tracking-tight md:text-2xl">
          Polecane oferty
        </h2>
        {filtered.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
            Brak firm w tej kategorii. Wróć wkrótce — katalog rośnie!
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((biz) => (
              <li key={biz.id}>
                <BusinessCard biz={biz} onStory={() => openStory(biz.id)} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {storyStart !== null && (
        <StoryViewer
          businesses={withStories}
          startIndex={storyStart}
          onClose={() => setStoryStart(null)}
        />
      )}
    </div>
  )
}

function BusinessCard({ biz, onStory }: { biz: LocalBusiness; onStory: () => void }) {
  const hasStories = (biz.stories?.length ?? 0) > 0
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      {/* Zdjęcie / plakietka oferty */}
      <button
        type="button"
        onClick={hasStories ? onStory : undefined}
        className="group relative block aspect-[16/10] w-full overflow-hidden text-left outline-none"
        aria-label={hasStories ? `Zobacz relacje: ${biz.name}` : biz.name}
      >
        <Image
          src={biz.image}
          alt={biz.name}
          fill
          sizes="(min-width: 1024px) 22rem, (min-width: 640px) 45vw, 100vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <SampleBadge />
        <div className="absolute inset-0 bg-gradient-to-t from-navy/70 via-transparent to-transparent" />
        <span
          className={`absolute left-3 top-3 inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold uppercase tracking-wide shadow-sm ${badgeTone[biz.badgeTone]}`}
        >
          {biz.badge}
        </span>
        {hasStories && (
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-navy shadow-sm">
            <span className={`size-2 rounded-full ${biz.ring.replace('ring-', 'bg-')}`} />
            Relacja
          </span>
        )}
      </button>

      {/* Treść */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold leading-tight text-foreground text-balance">{biz.name}</h3>
            {biz.rating != null && (
              <span className="flex shrink-0 items-center gap-1 text-sm font-bold text-foreground">
                <Star className="size-4 fill-gold text-gold" />
                {biz.rating.toFixed(1)}
              </span>
            )}
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Tag className="size-3" />
              {biz.category}
            </span>
            <span aria-hidden="true">•</span>
            <span className="flex items-center gap-1">
              <MapPin className="size-3" />
              {biz.address}
            </span>
          </p>
        </div>

        <div className="rounded-2xl bg-muted/60 p-3">
          <p className="text-sm font-bold text-foreground text-balance">{biz.offerTitle}</p>
          <p className="mt-0.5 text-xs text-muted-foreground text-pretty">{biz.offerDesc}</p>
        </div>

        {/* Akcje */}
        <div className="mt-auto flex items-center gap-2 pt-1">
          <Link
            href={`/firmy/${biz.id}`}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2.5 text-sm font-bold text-primary-foreground transition-transform active:scale-[0.98]"
          >
            Zobacz profil
            <ArrowRight className="size-4" />
          </Link>
          {biz.phone && (
            <a
              href={`tel:${biz.phone.replace(/\s/g, '')}`}
              className="flex size-11 items-center justify-center rounded-xl border border-border text-foreground transition-colors hover:bg-muted"
              aria-label={`Zadzwoń: ${biz.name}`}
            >
              <Phone className="size-5" />
            </a>
          )}
        </div>
      </div>
    </article>
  )
}

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { MapPin, Tag, ArrowRight } from 'lucide-react'
import type { LocalBusiness } from '@/lib/local-businesses'
import { SampleBadge } from '@/components/shared/sample-badge'

const badgeTone: Record<LocalBusiness['badgeTone'], string> = {
  red: 'bg-destructive text-background',
  eco: 'bg-eco text-eco-foreground',
  gold: 'bg-gold text-gold-foreground',
  primary: 'bg-primary text-primary-foreground',
}

/**
 * Karuzela promocji lokalnych firm — duże karty ze zdjęciem w tle, przewijane
 * w poziomie ze snapowaniem. Kropki pod karuzelą pokazują aktualną pozycję.
 * Wzorzec przewijania i synchronizacji kropek jak w `EventsCarousel`.
 */
export function LocalPromosCarousel({ items }: { items: LocalBusiness[] }) {
  const trackRef = useRef<HTMLUListElement>(null)
  const [active, setActive] = useState(0)

  const syncActive = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    const cards = Array.from(track.children) as HTMLElement[]
    if (cards.length === 0) return
    const center = track.scrollLeft + track.clientWidth / 2
    let nearest = 0
    let smallest = Number.POSITIVE_INFINITY
    cards.forEach((card, index) => {
      const distance = Math.abs(card.offsetLeft + card.offsetWidth / 2 - center)
      if (distance < smallest) {
        smallest = distance
        nearest = index
      }
    })
    setActive(nearest)
  }, [])

  useEffect(() => {
    syncActive()
  }, [syncActive])

  const goTo = (index: number) => {
    const track = trackRef.current
    const card = track?.children[index] as HTMLElement | undefined
    if (!track || !card) return
    track.scrollTo({ left: card.offsetLeft - 16, behavior: 'smooth' })
  }

  return (
    <div>
      <ul
        ref={trackRef}
        onScroll={syncActive}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-1 pl-4 pr-4 scroll-pl-4 [scrollbar-width:none] md:pl-0 md:pr-0 md:scroll-pl-0 [&::-webkit-scrollbar]:hidden"
      >
        {items.map((biz) => (
          <li
            key={biz.id}
            className="w-[88%] min-w-[16rem] max-w-[26rem] shrink-0 snap-start sm:w-[70%] md:w-[48%] lg:w-[32%]"
          >
            <PromoCard biz={biz} />
          </li>
        ))}
      </ul>

      {items.length > 1 && (
        <div className="mt-4 flex items-center justify-center gap-1.5">
          {items.map((biz, index) => (
            <button
              key={biz.id}
              type="button"
              onClick={() => goTo(index)}
              aria-label={`Przejdź do promocji: ${biz.name}`}
              aria-current={index === active}
              className={`h-1.5 rounded-full transition-all ${
                index === active
                  ? 'w-6 bg-primary'
                  : 'w-1.5 bg-border hover:bg-muted-foreground/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function PromoCard({ biz }: { biz: LocalBusiness }) {
  return (
    <article className="group relative flex aspect-[4/5] w-full flex-col justify-between overflow-hidden rounded-3xl bg-navy shadow-lg sm:aspect-[16/13]">
      <Image
        src={biz.image}
        alt=""
        fill
        sizes="(min-width: 1024px) 32vw, (min-width: 768px) 48vw, 88vw"
        className="object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <SampleBadge />
      {/* Ciemna poświata od dołu — poprawia czytelność jasnego tekstu na zdjęciu. */}
      <div className="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/45 to-navy/10" />

      <div className="relative flex items-start justify-between p-4 sm:p-5">
        <span
          className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold uppercase tracking-wide shadow-sm ${badgeTone[biz.badgeTone]}`}
        >
          {biz.badge}
        </span>
      </div>

      <div className="relative flex flex-col gap-3 p-4 sm:p-5">
        <div>
          <h3 className="text-balance text-2xl font-extrabold leading-tight text-navy-foreground sm:text-3xl">
            {biz.offerTitle}
          </h3>
          <p className="mt-1 text-pretty text-sm leading-relaxed text-navy-foreground/85">
            {biz.offerDesc}
          </p>
        </div>

        <Link
          href={`/firmy/${biz.id}`}
          prefetch={false}
          className="flex items-center gap-3 rounded-2xl outline-none transition-opacity hover:opacity-90"
          aria-label={`Zobacz profil: ${biz.name}`}
        >
          <span className="relative size-11 shrink-0 overflow-hidden rounded-full ring-2 ring-navy-foreground/60">
            <Image src={biz.image} alt="" fill sizes="44px" className="object-cover" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-navy-foreground">{biz.name}</p>
            <p className="flex items-center gap-2 truncate text-xs text-navy-foreground/75">
              <span className="flex items-center gap-1">
                <Tag className="size-3 shrink-0" />
                {biz.category}
              </span>
              <span aria-hidden="true">•</span>
              <span className="flex min-w-0 items-center gap-1">
                <MapPin className="size-3 shrink-0" />
                <span className="truncate">{biz.address}</span>
              </span>
            </p>
          </div>
        </Link>

        <Link
          href={`/firmy/${biz.id}`}
          prefetch={false}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-card px-4 py-2.5 text-sm font-bold text-foreground transition-transform hover:opacity-95 active:scale-[0.98]"
        >
          Zobacz ofertę
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </article>
  )
}

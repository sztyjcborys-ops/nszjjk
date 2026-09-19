'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowLeft,
  Star,
  MapPin,
  Phone,
  Tag,
  Play,
  Clock,
  ChevronDown,
  Flame,
} from 'lucide-react'
import type { LocalBusiness } from '@/lib/local-businesses'
import { StoryViewer } from './story-viewer'
import { SampleBadge } from '@/components/shared/sample-badge'
import { useViewedStories } from '@/hooks/use-viewed-stories'

/** Obwódka obejrzanej relacji jest szara (jak na Instagramie). */
const VIEWED_RING = 'ring-muted-foreground/40'

/**
 * Podświetla w opisie promocji kwoty, rabaty i słowa-klucze (np. „-15%",
 * „1 zł", „gratis"), żeby oferta „miała więcej energii" i była szybciej
 * czytelna. Regex ma jedną grupę przechwytującą, więc `split` zwraca tekst i
 * dopasowania naprzemiennie — dopasowania trafiają na nieparzyste indeksy.
 */
function emphasizePromo(text: string) {
  const parts = text.split(
    /(-?\d+\s?%|\d+\s?zł|za\s1\s?zł|gratis|bezpłatn\w*|za darmo|nowoś\w*)/gi,
  )
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-extrabold text-primary">
        {part}
      </strong>
    ) : (
      part
    ),
  )
}

const badgeTone: Record<LocalBusiness['badgeTone'], string> = {
  red: 'bg-destructive text-white',
  eco: 'bg-eco text-eco-foreground',
  gold: 'bg-gold text-gold-foreground',
  primary: 'bg-primary text-primary-foreground',
}

/**
 * Profil pojedynczej firmy (/firmy/[id]) — pełnoekranowy:
 *  • okładka na całą szerokość strony z awatarem i danymi firmy,
 *  • sekcja „O firmie",
 *  • atrakcyjna lista promocji (główna oferta + promocje z relacji),
 *  • relacje (rolki) uruchamiane w pełnoekranowej przeglądarce.
 */
type Offer = {
  id: string
  label: string
  title: string
  desc: string
  details?: string
  timeAgo?: string
  image: string
}

export function BusinessProfile({ biz }: { biz: LocalBusiness }) {
  const [storyOpen, setStoryOpen] = useState(false)
  const { isViewed } = useViewedStories()
  const stories = biz.stories ?? []
  const hasStories = stories.length > 0
  const viewed = isViewed(biz.id)

  const offers: Offer[] = [
    {
      id: 'main',
      label: biz.badge,
      title: biz.offerTitle,
      desc: biz.offerDesc,
      details: biz.offerDetails,
      image: biz.image,
    },
    ...stories.map((s) => ({
      id: s.id,
      label: s.badge,
      title: s.title,
      desc: s.subtitle ?? '',
      details: s.details,
      timeAgo: s.timeAgo,
      image: s.image,
    })),
  ]

  const [openOffer, setOpenOffer] = useState<string>('main')
  const phoneHref = biz.phone ? `tel:${biz.phone.replace(/\s/g, '')}` : undefined

  return (
    <div className="w-full pb-16">
      {/* Okładka na całą szerokość */}
      <div className="relative h-[52vh] min-h-[20rem] w-full md:h-[60vh]">
        <Image
          src={biz.image}
          alt={biz.name}
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        <SampleBadge className="right-4 top-16 md:right-6 md:top-20" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy/85 via-navy/25 to-navy/40" />

        {/* Górny pasek */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4 md:p-6">
          <Link
            href="/firmy"
            className="inline-flex items-center gap-1.5 rounded-full bg-black/30 px-3 py-1.5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-black/50"
          >
            <ArrowLeft className="size-4" />
            Wszystkie firmy
          </Link>
          <span
            className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold uppercase tracking-wide shadow-sm ${badgeTone[biz.badgeTone]}`}
          >
            {biz.badge}
          </span>
        </div>

        {/* Dolny nagłówek na okładce */}
        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto flex w-full max-w-5xl items-end gap-4 px-4 pb-6 md:px-6 md:pb-8">
            {hasStories ? (
              <button
                type="button"
                onClick={() => setStoryOpen(true)}
                aria-label={`Zobacz relacje: ${biz.name}`}
                className="group relative shrink-0 rounded-full outline-none"
              >
                <span
                  className={`relative block size-24 overflow-hidden rounded-full ring-4 ring-offset-2 ring-offset-navy transition-transform group-active:scale-[0.97] md:size-28 ${
                    viewed ? VIEWED_RING : biz.ring
                  }`}
                >
                  <Image src={biz.image} alt="" fill sizes="112px" className="object-cover" />
                </span>
                <span className="absolute bottom-1 right-1 flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-navy">
                  <Play className="size-4 fill-current" />
                </span>
              </button>
            ) : (
              <span
                className={`relative size-24 shrink-0 overflow-hidden rounded-full ring-4 ring-offset-2 ring-offset-navy md:size-28 ${biz.ring}`}
              >
                <Image src={biz.image} alt="" fill sizes="112px" className="object-cover" />
              </span>
            )}

            <div className="min-w-0 flex-1 pb-1">
              <h1 className="text-2xl font-bold tracking-tight text-white text-balance md:text-4xl">
                {biz.name}
              </h1>
              {biz.tagline && (
                <p className="mt-0.5 text-sm text-white/80 text-pretty md:text-base">
                  {biz.tagline}
                </p>
              )}
              {hasStories && (
                <p className="mt-1 text-xs font-medium text-white/70">
                  {viewed ? 'Relacje obejrzane' : 'Tapnij awatar, aby zobaczyć relacje'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Treść */}
      <div className="mx-auto w-full max-w-5xl px-4 md:px-6">
        {/* Pasek meta: ocena, kategoria, adres */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-border py-4 text-sm text-muted-foreground">
          {biz.rating != null && (
            <span className="flex items-center gap-1 font-bold text-foreground">
              <Star className="size-4 fill-gold text-gold" />
              {biz.rating.toFixed(1)}
              {biz.reviews != null && (
                <span className="font-medium text-muted-foreground">({biz.reviews} opinii)</span>
              )}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Tag className="size-4" />
            {biz.category}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="size-4" />
            {biz.address}
          </span>
        </div>

        <div className="grid gap-8 py-8 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:gap-10">
          {/* Lewa kolumna: O firmie + promocje */}
          <div className="flex min-w-0 flex-col gap-8">
            {biz.about && (
              <section>
                <h2 className="text-lg font-bold tracking-tight text-foreground">O firmie</h2>
                <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground text-pretty">
                  {biz.about}
                </p>
              </section>
            )}

            <section>
              <div className="mb-4 flex items-baseline justify-between gap-3">
                <h2 className="text-lg font-bold tracking-tight text-foreground">
                  Promocje i oferty
                </h2>
                <span className="text-xs font-medium text-muted-foreground">
                  {offers.length}{' '}
                  {offers.length === 1 ? 'aktualna' : offers.length < 5 ? 'aktualne' : 'aktualnych'}
                </span>
              </div>

              {/* Rozwijana lista ofert — czytelna, minimalistyczna, z pełnymi opisami */}
              <ul className="flex flex-col gap-2.5">
                {offers.map((offer) => {
                  const isOpen = openOffer === offer.id
                  return (
                    <li key={offer.id}>
                      <div
                        className={`overflow-hidden rounded-2xl border bg-card transition-colors ${
                          isOpen ? 'border-primary/40' : 'border-border'
                        }`}
                      >
                        <button
                          type="button"
                          aria-expanded={isOpen}
                          onClick={() => setOpenOffer(isOpen ? '' : offer.id)}
                          className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted/40"
                        >
                          <span className="relative size-14 shrink-0 overflow-hidden rounded-xl">
                            <Image
                              src={offer.image}
                              alt=""
                              fill
                              sizes="56px"
                              className="object-cover"
                            />
                            <SampleBadge size="sm" label="Wzór" className="right-1 top-1" />
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[0.7rem] font-semibold uppercase tracking-wide text-primary">
                              {offer.label}
                            </span>
                            <span className="mt-0.5 block truncate text-sm font-extrabold text-foreground">
                              {offer.title}
                            </span>
                            {!isOpen && offer.desc && (
                              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                                {offer.desc}
                              </span>
                            )}
                          </span>

                          <ChevronDown
                            className={`size-5 shrink-0 text-muted-foreground transition-transform duration-200 ease-out ${
                              isOpen ? 'rotate-180' : ''
                            }`}
                          />
                        </button>

                        <div
                          className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
                            isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                          }`}
                        >
                          <div className="overflow-hidden">
                            <div className="border-t border-border px-3 pb-3.5 pt-3">
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1 text-[0.7rem] font-extrabold uppercase tracking-wide text-destructive">
                                <Flame className="size-3.5 fill-destructive/20 text-destructive" />
                                {offer.label}
                              </span>
                              {offer.desc && (
                                <p className="mt-2.5 text-base font-semibold leading-snug text-foreground text-pretty">
                                  {emphasizePromo(offer.desc)}
                                </p>
                              )}
                              {offer.details && (
                                <div className="mt-3 rounded-xl border border-primary/15 bg-primary/5 p-3">
                                  <p className="text-[0.7rem] font-bold uppercase tracking-wide text-primary">
                                    Jak skorzystać
                                  </p>
                                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground text-pretty">
                                    {emphasizePromo(offer.details)}
                                  </p>
                                </div>
                              )}
                              {offer.timeAgo && (
                                <p className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                  <Clock className="size-3.5" />
                                  {offer.timeAgo}
                                </p>
                              )}
                              <div className="mt-3.5 flex flex-wrap gap-2">
                                {phoneHref && (
                                  <a
                                    href={phoneHref}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98]"
                                  >
                                    <Phone className="size-4" />
                                    Zadzwoń
                                  </a>
                                )}
                                {hasStories && (
                                  <button
                                    type="button"
                                    onClick={() => setStoryOpen(true)}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted/60"
                                  >
                                    <Play className="size-4 fill-current" />
                                    Relacja
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          </div>

          {/* Prawa kolumna: kontakt / akcje (sticky na desktopie) */}
          <aside className="min-w-0 md:sticky md:top-6 md:self-start">
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="text-base font-bold text-foreground">Kontakt</h2>

              <dl className="mt-3 flex flex-col gap-3 text-sm">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <dd className="text-foreground">{biz.address}</dd>
                </div>
                {biz.phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <dd>
                      <a
                        href={phoneHref}
                        className="font-medium text-foreground transition-colors hover:text-primary"
                      >
                        {biz.phone}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>

              <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
                {phoneHref && (
                  <a
                    href={phoneHref}
                    className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.99]"
                  >
                    <Phone className="size-4" />
                    Zadzwoń
                  </a>
                )}
                {hasStories && (
                  <button
                    type="button"
                    onClick={() => setStoryOpen(true)}
                    className="flex items-center justify-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted/60"
                  >
                    <Play className="size-4 fill-current" />
                    Zobacz relacje
                  </button>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {storyOpen && hasStories && (
        <StoryViewer businesses={[biz]} startIndex={0} onClose={() => setStoryOpen(false)} />
      )}
    </div>
  )
}

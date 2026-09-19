'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { LocalBusiness } from '@/lib/local-businesses'
import { StoryViewer } from '@/components/firmy/story-viewer'
import { useViewedStories } from '@/hooks/use-viewed-stories'

/** Obwódka obejrzanej relacji jest szara (jak na Instagramie). */
const VIEWED_RING = 'ring-muted-foreground/40'

/**
 * Pasek okrągłych awatarów firm na stronie głównej. Kliknięcie firmy z
 * relacjami otwiera pełnoekranową przeglądarkę relacji bezpośrednio ze strony
 * głównej; firmy bez relacji prowadzą do swojego profilu.
 */
export function LocalStoriesBar({ businesses }: { businesses: LocalBusiness[] }) {
  const [storyStart, setStoryStart] = useState<number | null>(null)
  const { isViewed } = useViewedStories()

  const withStories = useMemo(
    () => businesses.filter((b) => (b.stories?.length ?? 0) > 0),
    [businesses],
  )

  const openStory = (bizId: string) => {
    const idx = withStories.findIndex((b) => b.id === bizId)
    if (idx >= 0) setStoryStart(idx)
  }

  return (
    <>
      <ul className="mb-6 flex gap-4 overflow-x-auto px-4 py-2 [scrollbar-width:none] md:px-0 [&::-webkit-scrollbar]:hidden">
        {businesses.map((biz) => {
          const hasStories = (biz.stories?.length ?? 0) > 0
          const ring = isViewed(biz.id) ? VIEWED_RING : biz.ring
          const avatar = (
            <span
              className={`relative size-14 overflow-hidden rounded-full ring-2 ring-offset-2 ring-offset-background transition-transform hover:scale-105 ${ring}`}
            >
              <Image src={biz.image} alt="" fill sizes="56px" className="object-cover" />
            </span>
          )
          return (
            <li key={biz.id} className="shrink-0">
              {hasStories ? (
                <button
                  type="button"
                  onClick={() => openStory(biz.id)}
                  className="flex w-16 flex-col items-center gap-1.5 text-center outline-none"
                  aria-label={`Zobacz relacje: ${biz.name}`}
                >
                  {avatar}
                  <span className="text-xs font-medium leading-tight text-foreground text-pretty">
                    {biz.shortName}
                  </span>
                </button>
              ) : (
                <Link
                  href={`/firmy/${biz.id}`}
                  prefetch={false}
                  className="flex w-16 flex-col items-center gap-1.5 text-center outline-none"
                >
                  {avatar}
                  <span className="text-xs font-medium leading-tight text-foreground text-pretty">
                    {biz.shortName}
                  </span>
                </Link>
              )}
            </li>
          )
        })}
      </ul>

      {storyStart !== null && (
        <StoryViewer
          businesses={withStories}
          startIndex={storyStart}
          onClose={() => setStoryStart(null)}
        />
      )}
    </>
  )
}

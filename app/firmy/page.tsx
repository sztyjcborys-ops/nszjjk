import type { Metadata } from 'next'
import { Handshake, Clock, Mail } from 'lucide-react'
import { localBusinesses } from '@/lib/local-businesses'
import { SectionTitle } from '@/components/shared/section-title'
import { FirmyExplorer } from '@/components/firmy/firmy-explorer'

export const metadata: Metadata = {
  title: 'Lokalne firmy | Jejkowice — nasza gmina!',
  description:
    'Poznaj lokalne firmy z Jejkowic, przeglądaj ich relacje i oferty oraz wspieraj przedsiębiorców z naszej gminy.',
}

export default function FirmyPage() {
  return (
    <div className="flex flex-col gap-12 pb-16 md:gap-16 md:pb-24">
      <div className="mx-auto w-full max-w-6xl px-4 pt-6 md:px-6 md:pt-10">
        <SectionTitle
          eyebrow="Lokalne firmy"
          title="Poznaj, wspieraj, korzystaj"
          description="Firmy z Jejkowic w jednym miejscu — zobacz ich relacje, aktualne oferty i skontaktuj się bezpośrednio."
        />

        {/* Baner „Wspieraj lokalnie" */}
        <div className="mb-8 flex items-center gap-4 rounded-3xl border border-eco/20 bg-eco/8 p-4 md:p-5">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-eco/15 text-eco">
            <Handshake className="size-6" />
          </span>
          <div className="min-w-0">
            <p className="font-bold text-eco">Wspieraj lokalnie</p>
            <p className="text-sm text-muted-foreground text-pretty">
              Lokalne firmy tworzą naszą gminę. Kupując u nich, wspierasz sąsiadów.
            </p>
          </div>
        </div>

        <FirmyExplorer businesses={localBusinesses} />
      </div>

      {/* Sekcja „coming soon" — jeden estetyczny blok */}
      <div className="mx-auto w-full max-w-3xl px-4 md:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 text-center shadow-sm md:p-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full bg-primary/5 blur-3xl"
          />
          <div className="relative flex flex-col items-center gap-5">
            <p className="max-w-xl text-lg font-medium text-balance text-foreground md:text-xl">
              Już wkrótce znajdziesz tutaj oferty, promocje i aktualności lokalnych firm.
            </p>

            <span
              aria-disabled="true"
              className="inline-flex cursor-default select-none items-center gap-2 rounded-2xl border border-dashed border-primary/40 bg-primary/5 px-6 py-3 text-sm font-bold text-primary"
            >
              <Clock className="size-4" />
              Wkrótce dostępne
            </span>

            <p className="text-sm text-muted-foreground text-pretty">
              Prowadzisz firmę w Jejkowicach? Napisz do nas:{' '}
              <a
                href="mailto:naszejejkowice@gmail.com"
                className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
              >
                <Mail className="size-3.5" />
                naszejejkowice@gmail.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

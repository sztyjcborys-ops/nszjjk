import { Bell, WifiOff, MapPin, Check, X } from "lucide-react"
import { WasteAddressLookup } from "@/components/waste/waste-address-lookup"

const sortGuide = [
  {
    type: "Papier",
    color: "oklch(0.52 0.2 264)",
    yes: "Gazety, kartony, papierowe torby",
    no: "Zabrudzony i mokry papier, tapety",
  },
  {
    type: "Plastik i metal",
    color: "oklch(0.83 0.15 83)",
    yes: "Butelki PET, puszki, folie, kartony po mleku",
    no: "Zabawki, sprzęt elektroniczny",
  },
  {
    type: "Szkło",
    color: "oklch(0.58 0.14 152)",
    yes: "Butelki i słoiki szklane bez zawartości",
    no: "Szyby, lustra, porcelana, żarówki",
  },
  {
    type: "Bioodpady",
    color: "oklch(0.45 0.09 60)",
    yes: "Obierki, resztki warzyw, skoszona trawa",
    no: "Mięso, kości, popiół, ziemia",
  },
]

export function WasteSchedule() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-6">
        {/* Address lookup + computed schedule */}
        <WasteAddressLookup />

        {/* Reminders — temporarily unavailable */}
        <div className="rounded-3xl border border-border bg-card p-4 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground sm:size-10">
                <Bell className="size-4 sm:size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold sm:text-base">Przypomnienia</p>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Powiadomienia o odbiorze odpadów
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={false}
              aria-label="Przypomnienia tymczasowo niedostępne"
              disabled
              className="relative h-7 w-12 shrink-0 cursor-not-allowed rounded-full bg-muted opacity-60"
            >
              <span className="absolute top-1 size-5 translate-x-1 rounded-full bg-card shadow" />
            </button>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-dashed border-border bg-secondary/40 px-4 py-2.5 text-xs text-muted-foreground sm:text-sm">
            <WifiOff className="size-4 shrink-0" aria-hidden />
            <span className="font-medium">
              Powiadomienia push są tymczasowo niedostępne. Pracujemy nad ich uruchomieniem.
            </span>
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-6">
        {/* Sorting guide */}
        <div className="rounded-3xl border border-border bg-card p-4 sm:p-6">
          <h2 className="text-base font-bold sm:text-lg">Gdzie wrzucać?</h2>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Praktyczny przewodnik segregacji odpadów.
          </p>
          <ul className="mt-3 divide-y divide-border">
            {sortGuide.map((g) => (
              <li key={g.type} className="py-3.5 first:pt-1">
                <div className="mb-2 flex items-center gap-2.5">
                  <span className="size-3 rounded-full" style={{ backgroundColor: g.color }} aria-hidden />
                  <span className="text-sm font-bold">{g.type}</span>
                </div>
                <div className="space-y-1.5 pl-[1.375rem]">
                  <p className="flex items-start gap-2 text-xs leading-snug text-foreground">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-eco" aria-hidden />
                    <span>{g.yes}</span>
                  </p>
                  <p className="flex items-start gap-2 text-xs leading-snug text-muted-foreground">
                    <X className="mt-0.5 size-3.5 shrink-0 text-destructive" aria-hidden />
                    <span>{g.no}</span>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* PSZOK */}
        <div className="rounded-3xl bg-navy p-4 text-navy-foreground sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-eco/20 text-eco sm:size-11">
              <MapPin className="size-5" />
            </span>
            <div>
              <h2 className="text-base font-bold sm:text-lg">PSZOK Rybnik</h2>
              <p className="mt-1 text-xs text-navy-foreground/70 sm:text-sm">
                ul. Sportowa (obok nr 110), Rybnik
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-2 rounded-2xl bg-white/[0.07] p-4 text-sm sm:mt-5">
            <div className="flex items-center justify-between">
              <span className="text-navy-foreground/70">Pon. – Pt.</span>
              <span className="font-semibold">07:00 – 19:00</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-navy-foreground/70">Sobota</span>
              <span className="font-semibold">08:00 – 15:00</span>
            </div>
            <div className="flex items-center justify-between border-t border-white/10 pt-2">
              <span className="text-navy-foreground/70">Telefon</span>
              <a href="tel:+48797848337" className="font-semibold text-gold hover:underline">
                797 848 337
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

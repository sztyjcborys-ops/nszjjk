import Link from 'next/link'
import { TriangleAlert, Recycle, CalendarDays, ChartColumn, ArrowRight } from 'lucide-react'

const items = [
  { value: '2', label: 'Utrudnienia drogowe', icon: TriangleAlert, tone: 'text-accent' },
  { value: 'Jutro', label: 'Odbiór papieru', icon: Recycle, tone: 'text-eco' },
  { value: '3', label: 'Wydarzenia w tym tygodniu', icon: CalendarDays, tone: 'text-primary-foreground' },
  { value: '1', label: 'Aktywna ankieta', icon: ChartColumn, tone: 'text-gold' },
]

export function StatusStrip() {
  return (
    <section className="mx-auto max-w-6xl px-4 md:px-6">
      <div className="rounded-3xl bg-navy p-6 text-navy-foreground md:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Jejkowice teraz</h2>
            <p className="text-sm text-navy-foreground/60">Na dziś, 17 maja 2024</p>
          </div>
          <Link
            href="/aktualnosci"
            prefetch={false}
            className="flex items-center gap-1 text-sm font-semibold text-gold hover:underline"
          >
            Zobacz więcej
            <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {items.map((item) => {
            const Icon = item.icon
            return (
              <div key={item.label} className="rounded-2xl bg-white/[0.07] p-4">
                <Icon className={`mb-3 size-6 ${item.tone}`} />
                <p className="text-2xl font-bold leading-none">{item.value}</p>
                <p className="mt-1.5 text-xs text-navy-foreground/60 text-pretty">
                  {item.label}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

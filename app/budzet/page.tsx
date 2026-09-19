import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BarChart3, History, Info, LineChart, ListTree, PieChart } from 'lucide-react'
import { BUDGET_PAGE_ENABLED } from '@/lib/features'
import { PageHeader } from '@/components/shared/page-header'
import { BudgetSummary } from '@/components/budget/budget-summary'
import { CollapsibleSection } from '@/components/budget/collapsible-section'
import { BudgetHistory } from '@/components/budget/budget-history'
import { StructureChart } from '@/components/budget/structure-chart'
import { DepartmentsChart } from '@/components/budget/departments-chart'
import { BudgetDetails } from '@/components/budget/budget-details'
import { BudgetChanges } from '@/components/budget/budget-changes'
import { buildOverview, getBudgetData, groupItemsBySection } from '@/lib/budget'

export const metadata: Metadata = {
  title: 'Budżet Jejkowic 2026',
  description:
    'Na co gmina Jejkowice przeznacza pieniądze w 2026 roku — dochody, wydatki, struktura działów i historia zmian budżetu.',
}

// Dane odświeżają się z Supabase co 5 minut.
export const revalidate = 300

function SectionCard({
  icon: Icon,
  title,
  description,
  badge,
  children,
}: {
  icon: typeof PieChart
  title: string
  description?: React.ReactNode
  badge?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex items-start gap-3 sm:mb-5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-[18px]" strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-balance text-base font-bold tracking-tight text-foreground sm:text-lg">
              {title}
            </h2>
            {badge ? (
              <span className="inline-flex shrink-0 items-center rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                {badge}
              </span>
            ) : null}
          </div>
          {description ? (
            <p className="mt-0.5 text-pretty text-[12.5px] leading-snug text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  )
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl bg-muted/60 px-3.5 py-3 text-[13px] leading-relaxed text-muted-foreground">
      <Info className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={2} />
      <p className="text-pretty">{children}</p>
    </div>
  )
}

export default async function BudgetPage() {
  // Strona budżetu jest ukryta. Dopóki flaga jest wyłączona, wejście na
  // /budzet zwraca 404 (tak, jakby strona nie istniała). Aby ją przywrócić,
  // ustaw BUDGET_PAGE_ENABLED na `true` w lib/features.ts.
  if (!BUDGET_PAGE_ENABLED) {
    notFound()
  }

  const { summary, budgets, items, changes, failed } = await getBudgetData()
  const overview = buildOverview(budgets, summary)
  const sections = groupItemsBySection(items)

  const hasSummary = overview.current != null
  const hasBudgets = overview.segments.length > 0
  const hasItems = sections.length > 0
  const hasChanges = changes.length > 0
  const hasHistory = overview.history.length > 1
  const hasAnyData = hasSummary || hasBudgets || hasItems || hasChanges

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-12">
      <PageHeader
        eyebrow="Finanse gminy"
        title="Budżet gminy"
        description="Przejrzysty obraz gminnych finansów — ile mamy, na co idą pieniądze i jak budżet zmieniał się w ciągu roku. Wszystkie dane pochodzą wprost z rejestru budżetowego gminy."
      />

      {failed && !hasAnyData ? (
        <EmptyNote>
          Dane budżetu są chwilowo niedostępne. Trwa ich przygotowywanie — zajrzyj tu ponownie za
          kilka chwil.
        </EmptyNote>
      ) : (
        <div className="flex flex-col gap-4 sm:gap-6">
          <div className="flex flex-col gap-3 sm:gap-4">
            <h2 className="text-balance text-lg font-bold tracking-tight text-foreground sm:text-xl">
              Aktualny budżet
            </h2>
            <BudgetSummary overview={overview} />
          </div>

          {hasBudgets ? (
            <SectionCard
              icon={PieChart}
              title="Struktura wydatków"
              description={
                <>
                  Podział wydatków według działów w budżecie uchwalonym{" "}
                  <strong className="font-semibold text-foreground">22 grudnia 2025 r.</strong>
                </>
              }
            >
              <StructureChart segments={overview.segments} total={overview.grandTotal} />
            </SectionCard>
          ) : null}

          {hasBudgets ? (
            <SectionCard
              icon={BarChart3}
              title="Ranking działów"
              description="Największe pozycje budżetu uszeregowane według kwoty."
            >
              <DepartmentsChart segments={overview.segments} />
            </SectionCard>
          ) : null}

          {hasItems ? (
            <SectionCard
              icon={ListTree}
              title="Szczegóły budżetu"
              description="Rozwiń rozdział, aby zobaczyć konkretne pozycje wydatków."
            >
              <BudgetDetails sections={sections} />
            </SectionCard>
          ) : null}

          {hasHistory ? (
            <CollapsibleSection
              icon={<LineChart className="size-[18px]" strokeWidth={2} />}
              title="Budżet w ciągu roku"
              description="Jak zmieniały się dochody, wydatki i deficyt w kolejnych uchwałach budżetowych."
            >
              <BudgetHistory history={overview.history} />
            </CollapsibleSection>
          ) : null}

          {hasChanges ? (
            <CollapsibleSection
              icon={<History className="size-[18px]" strokeWidth={2} />}
              title="Historia zmian"
              description="Kolejne uchwały korygujące budżet w trakcie roku."
            >
              <BudgetChanges changes={changes} />
            </CollapsibleSection>
          ) : null}

          {!hasAnyData ? (
            <EmptyNote>Brak danych budżetowych do wyświetlenia.</EmptyNote>
          ) : null}

          <p className="px-1 text-[11.5px] leading-relaxed text-muted-foreground">
            Dane pochodzą z rejestru budżetowego gminy Jejkowice na rok 2026 i są aktualizowane po
            każdym zarządzeniu wójta lub uchwale. Kwoty prezentowane są w złotych, zaokrąglone do
            pełnych złotych.
          </p>
        </div>
      )}
    </div>
  )
}

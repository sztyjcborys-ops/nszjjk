import { surveyResults } from '@/lib/data'

export type SurveyResultItem = {
  label: string
  /** procent (0–100) */
  value: number
  color: string
}

export function SurveyResults({
  results,
  total = 342,
}: {
  /** Wyniki z bazy. Gdy brak — pokazujemy statyczny przykład (jak dotychczas). */
  results?: SurveyResultItem[]
  total?: number
}) {
  const data = results && results.length > 0 ? results : surveyResults
  return (
    <div>
      <div className="space-y-4">
        {data.map((r) => (
          <div key={r.label}>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="font-medium">{r.label}</span>
              <span className="font-bold text-muted-foreground">{r.value}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{ width: `${r.value}%`, backgroundColor: r.color }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        Liczba głosów: <span className="font-semibold text-foreground">{total}</span>
      </p>
    </div>
  )
}

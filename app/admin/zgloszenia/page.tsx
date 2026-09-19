import type { Metadata } from 'next'
import { Suspense } from 'react'
import { countByStatus } from '@/lib/reports'
import { getReports } from '@/lib/reports-server'
import { ReportsBoard } from '@/components/admin/reports-board'
import { ReportToast } from '@/components/admin/report-toast'
import { plural } from '@/lib/polish-plural'

export const metadata: Metadata = {
  title: 'Zgłoszenia — panel | Jejkowice',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function ReportsPage() {
  const reports = await getReports()

  const counts = countByStatus(reports)
  const openCount = counts['Zgłoszone'] + counts['W trakcie']

  return (
    <div className="grid min-w-0 grid-cols-1 gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Zgłoszenia</h1>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          {reports.length === 0
            ? 'Zgłoszenia mieszkańców pojawią się tutaj.'
            : `${plural(reports.length, { one: 'zgłoszenie', few: 'zgłoszenia', many: 'zgłoszeń' })} · ${openCount} w toku`}
        </p>
      </header>

      <ReportsBoard reports={reports} />

      <Suspense fallback={null}>
        <ReportToast />
      </Suspense>
    </div>
  )
}

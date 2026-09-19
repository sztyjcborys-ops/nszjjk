'use client'

import { useRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { REPORT_STATUSES, type ReportStatus } from '@/lib/reports'
import { updateReportStatusAction } from '@/app/admin/zgloszenia/actions'

/** Dropdown „Zmień status" — zapisuje od razu po wyborze (jak na liście). */
export function ReportStatusForm({
  id,
  status,
}: {
  id: string
  status: ReportStatus
}) {
  const formRef = useRef<HTMLFormElement>(null)
  return (
    <form ref={formRef} action={updateReportStatusAction} className="relative w-full sm:w-48">
      <input type="hidden" name="id" value={id} />
      <select
        name="status"
        defaultValue={status}
        onChange={() => formRef.current?.requestSubmit()}
        aria-label="Zmień status zgłoszenia"
        className="w-full cursor-pointer appearance-none rounded-xl border border-border bg-muted/60 py-2.5 pl-4 pr-9 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        {REPORT_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </form>
  )
}

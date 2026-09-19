import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, MapPin, Mail, Clock, ImageIcon, AlertCircle } from 'lucide-react'
import { getReportById, getSignedReportImages, getReportNotes } from '@/lib/reports-server'
import {
  REPORT_CATEGORY_LABELS,
  relativeTime,
  statusBadgeClass,
} from '@/lib/reports'
import { ReportStatusForm } from '@/components/admin/report-status-form'
import { ReportActionsMenu } from '@/components/admin/report-actions-menu'
import { ReportNotes } from '@/components/admin/report-notes'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Szczegóły zgłoszenia — panel | Jejkowice',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

export default async function ReportDetailPage({ params }: Params) {
  const { id } = await params
  const report = await getReportById(id)
  if (!report) notFound()

  const [signed, notes] = await Promise.all([
    getSignedReportImages(report.image_paths),
    getReportNotes(report.id),
  ])
  const images = report.image_paths.map((p) => signed[p]).filter(Boolean)
  const shortId = report.id.slice(0, 6).toUpperCase()
  const isNew = report.status === 'Zgłoszone'
  const categoryLabel = REPORT_CATEGORY_LABELS[report.category] ?? report.category
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    report.location,
  )}`

  return (
    <div className="mx-auto grid max-w-2xl gap-4 md:gap-6">
      {/* Nagłówek nawigacyjny — „Szczegóły" + menu „…" */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/admin/zgloszenia"
          className="-ml-2 inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-bold transition-colors hover:bg-muted md:text-base"
        >
          <ArrowLeft className="size-4 md:size-5" />
          Szczegóły
        </Link>
        <ReportActionsMenu id={report.id} />
      </div>

      {/* Plakietka statusu + ID */}
      <div className="flex items-center justify-between gap-3">
        <span
          className={cn(
            'inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ring-border/60 md:px-3 md:text-sm',
            isNew ? 'bg-destructive/10 text-destructive ring-destructive/25' : statusBadgeClass(report.status),
          )}
        >
          {isNew ? (
            <AlertCircle className="size-3.5 md:size-4" />
          ) : (
            <span className="size-2 rounded-full bg-current" aria-hidden />
          )}
          {isNew ? 'Nowe zgłoszenie' : report.status}
        </span>
        <span className="text-xs font-medium tabular-nums text-muted-foreground md:text-sm">
          #{shortId}
        </span>
      </div>

      {/* Tytuł + meta */}
      <header className="grid gap-1.5 md:gap-2">
        <h1 className="text-xl font-bold leading-tight tracking-tight text-balance md:text-3xl">
          {categoryLabel}
        </h1>
        <p className="text-xs text-muted-foreground md:text-sm">Zgłoszenie od mieszkańca</p>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground md:text-sm">
          <Clock className="size-3.5 md:size-4" />
          {relativeTime(report.created_at)}
        </p>
      </header>

      {/* Lokalizacja — z funkcjonalnym przyciskiem mapy */}
      <section className="flex items-center gap-2.5 rounded-xl border border-border bg-card p-2.5 shadow-sm md:gap-3 md:rounded-2xl md:p-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary md:size-10 md:rounded-xl">
          <MapPin className="size-4 md:size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground md:text-xs">
            Lokalizacja
          </p>
          <p className="truncate text-sm font-medium md:text-base">{report.location}</p>
        </div>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Pokaż lokalizację na mapie"
          title="Pokaż na mapie"
          className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-primary transition-colors hover:border-primary/40 hover:bg-primary/5 md:size-11 md:rounded-xl"
        >
          <MapPin className="size-4 md:size-5" />
        </a>
      </section>

      {/* Opis */}
      <section className="grid gap-2">
        <h2 className="text-sm font-bold md:text-base">Opis</h2>
        <div className="rounded-xl border border-border bg-card p-3 shadow-sm md:rounded-2xl md:p-4">
          <p className="whitespace-pre-line text-sm leading-relaxed text-card-foreground/80 text-pretty">
            {report.description}
          </p>
        </div>
      </section>

      {/* Zdjęcia */}
      <section className="grid gap-2 md:gap-3">
        <h2 className="text-sm font-bold md:text-base">
          Zdjęcia{report.image_paths.length > 0 && ` (${report.image_paths.length})`}
        </h2>
        {images.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 md:gap-3">
            {images.map((src, i) => (
              <div
                key={src}
                className="relative aspect-square overflow-hidden rounded-lg border border-border shadow-sm md:rounded-2xl"
              >
                <Image
                  src={src || '/placeholder.svg'}
                  alt={`Zdjęcie zgłoszenia ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 33vw, 200px"
                />
              </div>
            ))}
          </div>
        ) : report.image_paths.length > 0 ? (
          <p className="flex items-center gap-1.5 rounded-xl border border-border bg-card p-3 text-sm text-muted-foreground shadow-sm md:rounded-2xl md:p-4">
            <ImageIcon className="size-4" />
            {report.image_paths.length} zdjęć — nie udało się wczytać podglądu
          </p>
        ) : (
          <p className="rounded-xl border border-border bg-card p-3 text-sm text-muted-foreground shadow-sm md:rounded-2xl md:p-4">
            Brak zdjęć w tym zgłoszeniu.
          </p>
        )}
      </section>

      {/* Status */}
      <section className="grid gap-2 md:gap-3">
        <h2 className="text-sm font-bold md:text-base">Status</h2>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-sm md:rounded-2xl md:p-4">
          <span
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ring-border/60 md:px-3 md:text-sm',
              isNew ? 'bg-destructive/10 text-destructive ring-destructive/25' : statusBadgeClass(report.status),
            )}
          >
            <span className="size-2 rounded-full bg-current" aria-hidden />
            {isNew ? 'Nowe' : report.status}
          </span>
          <ReportStatusForm id={report.id} status={report.status} />
        </div>
      </section>

      {/* Notatki wewnętrzne */}
      <ReportNotes reportId={report.id} notes={notes} />

      {/* Kontakt */}
      {report.contact_email && (
        <section className="grid gap-2 md:gap-3">
          <h2 className="text-sm font-bold md:text-base">Kontakt do zgłaszającego</h2>
          <a
            href={`mailto:${report.contact_email}`}
            className="flex items-center gap-2.5 rounded-xl border border-border bg-card p-3 shadow-sm transition-colors hover:border-primary/40 hover:bg-muted/40 md:gap-3 md:rounded-2xl md:p-4"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary md:size-10 md:rounded-xl">
              <Mail className="size-4 md:size-5" />
            </span>
            <span className="min-w-0 truncate text-sm font-medium md:text-base">{report.contact_email}</span>
          </a>
        </section>
      )}
    </div>
  )
}

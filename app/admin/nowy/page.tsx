import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ArticleForm } from '@/components/admin/article-form'

export const metadata: Metadata = {
  title: 'Nowy artykuł | Panel Jejkowice',
  robots: { index: false, follow: false },
}

export default function NewArticlePage() {
  return (
    <div className="grid gap-6">
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Wróć do listy
        </Link>
        <h1 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">Nowy artykuł</h1>
      </div>
      <ArticleForm />
    </div>
  )
}

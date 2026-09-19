import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { LoginForm } from './login-form'

export const metadata: Metadata = {
  title: 'Logowanie | Panel redakcyjny Jejkowice',
  robots: { index: false, follow: false },
}

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100svh-3.5rem)] w-full max-w-md flex-col justify-center px-4 py-12">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Wróć na stronę
      </Link>

      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm md:p-8">
        <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
          Panel redakcyjny
        </span>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">Zaloguj się</h1>
        <p className="mt-2 text-sm text-muted-foreground text-pretty">
          Dostęp tylko dla redakcji. Zaloguj się, aby dodawać i edytować aktualności.
        </p>

        <LoginForm />
      </div>
    </div>
  )
}

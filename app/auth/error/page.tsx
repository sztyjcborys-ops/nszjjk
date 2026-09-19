import Link from 'next/link'
import { TriangleAlert } from 'lucide-react'

export const metadata = { title: 'Błąd logowania | Jejkowice' }

export default function AuthErrorPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <TriangleAlert className="size-7" />
      </span>
      <h1 className="mt-5 text-2xl font-bold">Coś poszło nie tak</h1>
      <p className="mt-2 text-muted-foreground text-pretty">
        Nie udało się dokończyć logowania. Spróbuj ponownie lub skontaktuj się z administratorem.
      </p>
      <Link
        href="/admin/login"
        className="mt-6 inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Wróć do logowania
      </Link>
    </div>
  )
}

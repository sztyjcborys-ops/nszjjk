'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { TriangleAlert, Loader2 } from 'lucide-react'
import { signInAction, type AuthState } from '../actions'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-70"
    >
      {pending && <Loader2 className="size-4 animate-spin" />}
      {pending ? 'Logowanie…' : 'Zaloguj się'}
    </button>
  )
}

export function LoginForm() {
  const [state, formAction] = useActionState<AuthState, FormData>(signInAction, {})

  return (
    <form action={formAction} className="mt-6 grid gap-4">
      <div className="grid gap-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          Adres e-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          placeholder="redakcja@jejkowice.pl"
        />
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          Hasło
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          placeholder="••••••••"
        />
      </div>

      {state.error && (
        <p className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
          <TriangleAlert className="size-4 shrink-0" />
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  )
}

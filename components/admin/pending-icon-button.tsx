'use client'

import type { ComponentProps, ReactNode } from 'react'
import { useFormStatus } from 'react-dom'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Przycisk akcji w tabelach panelu (oko, przypięcie, usuwanie itp.).
 * W trakcie akcji serwerowej pokazuje kręcące się kółeczko, żeby było widać,
 * że trwa zapis do bazy. useFormStatus działa tylko wewnątrz <form>, więc to
 * osobny komponent kliencki opakowujący <button type="submit">.
 */
export function PendingIconButton({
  children,
  className,
  spinnerClassName,
  ...rest
}: {
  children: ReactNode
  spinnerClassName?: string
} & Omit<ComponentProps<'button'>, 'type' | 'children'>) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      aria-busy={pending}
      disabled={pending || rest.disabled}
      {...rest}
      className={cn('disabled:pointer-events-none', className)}
    >
      {pending ? <Loader2 className={cn('size-4 animate-spin', spinnerClassName)} /> : children}
    </button>
  )
}

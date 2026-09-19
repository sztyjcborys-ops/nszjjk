'use client'

import { useActionState, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import {
  UserPlus,
  Loader2,
  TriangleAlert,
  CheckCircle2,
  Trash2,
  ShieldCheck,
  Users,
  Eye,
  EyeOff,
  Pencil,
  X,
  Save,
} from 'lucide-react'
import {
  createUserAction,
  changeRoleAction,
  deleteUserAction,
  updateUserAction,
  type CreateUserState,
  type UpdateUserState,
  type UserRow,
  type Role,
} from './actions'
import { PendingIconButton } from '@/components/admin/pending-icon-button'

const ROLE_LABELS: Record<Role, string> = {
  resident: 'Mieszkaniec',
  editor: 'Redaktor',
  admin: 'Administrator',
}

/** Pole hasła z przełącznikiem podglądu (oko). */
function PasswordField({
  id,
  name,
  required,
  minLength,
  placeholder,
  autoComplete,
  defaultValue,
}: {
  id: string
  name: string
  required?: boolean
  minLength?: number
  placeholder?: string
  autoComplete?: string
  defaultValue?: string
}) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={visible ? 'text' : 'password'}
        required={required}
        minLength={minLength}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 pr-11 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
        placeholder={placeholder}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Ukryj hasło' : 'Pokaż hasło'}
        className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}

function CreateSubmit() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-70"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
      {pending ? 'Tworzenie…' : 'Dodaj użytkownika'}
    </button>
  )
}

function AddUserForm() {
  const [state, formAction] = useActionState<CreateUserState, FormData>(createUserAction, {})
  const formRef = useRef<HTMLFormElement>(null)

  return (
    <form
      ref={formRef}
      action={formAction}
      key={state.success /* reset pól po sukcesie */}
      className="rounded-2xl border border-border bg-card p-4 sm:p-5"
    >
      <div className="flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <UserPlus className="size-4" />
        </span>
        <h2 className="text-base font-semibold">Dodaj użytkownika</h2>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <label htmlFor="new-email" className="text-sm font-medium">
            Adres e-mail
          </label>
          <input
            id="new-email"
            name="email"
            type="email"
            required
            autoComplete="off"
            className="rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            placeholder="redaktor@jejkowice.pl"
          />
          {state.fieldErrors?.email && (
            <span className="text-xs text-destructive">{state.fieldErrors.email}</span>
          )}
        </div>

        <div className="grid gap-1.5">
          <label htmlFor="new-name" className="text-sm font-medium">
            Imię i nazwisko <span className="text-muted-foreground">(opcjonalnie)</span>
          </label>
          <input
            id="new-name"
            name="full_name"
            type="text"
            autoComplete="off"
            className="rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            placeholder="Jan Kowalski"
          />
        </div>

        <div className="grid gap-1.5">
          <label htmlFor="new-password" className="text-sm font-medium">
            Hasło
          </label>
          <PasswordField
            id="new-password"
            name="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="min. 8 znaków"
          />
          {state.fieldErrors?.password && (
            <span className="text-xs text-destructive">{state.fieldErrors.password}</span>
          )}
        </div>

        <div className="grid gap-1.5">
          <label htmlFor="new-role" className="text-sm font-medium">
            Rola
          </label>
          <select
            id="new-role"
            name="role"
            defaultValue="editor"
            className="rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <option value="editor">Redaktor</option>
            <option value="admin">Administrator</option>
            <option value="resident">Mieszkaniec</option>
          </select>
        </div>
      </div>

      {state.error && (
        <p className="mt-4 flex items-center gap-2 rounded-xl bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
          <TriangleAlert className="size-4 shrink-0" />
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="mt-4 flex items-center gap-2 rounded-xl bg-eco/15 px-3.5 py-2.5 text-sm text-eco">
          <CheckCircle2 className="size-4 shrink-0" />
          {state.success}
        </p>
      )}

      <div className="mt-4 flex justify-end">
        <CreateSubmit />
      </div>
    </form>
  )
}

function RoleSelect({ user, isSelf }: { user: UserRow; isSelf: boolean }) {
  return (
    <form action={changeRoleAction} className="flex items-center gap-2">
      <input type="hidden" name="id" value={user.id} />
      <select
        name="role"
        defaultValue={user.role}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        disabled={isSelf}
        aria-label={`Rola użytkownika ${user.email ?? ''}`}
        className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <option value="resident">Mieszkaniec</option>
        <option value="editor">Redaktor</option>
        <option value="admin">Administrator</option>
      </select>
      <noscript>
        <button type="submit" className="rounded-lg bg-muted px-2 py-1.5 text-xs">
          Zapisz
        </button>
      </noscript>
    </form>
  )
}

function EditSubmit() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-70"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
      {pending ? 'Zapisywanie…' : 'Zapisz zmiany'}
    </button>
  )
}

/** Panel edycji danych użytkownika (imię + zmiana hasła). */
function EditUserPanel({ user, onClose }: { user: UserRow; onClose: () => void }) {
  const [state, formAction] = useActionState<UpdateUserState, FormData>(updateUserAction, {})

  return (
    <form
      action={formAction}
      className="mt-3 grid gap-4 rounded-xl border border-border bg-background/60 p-4"
    >
      <input type="hidden" name="id" value={user.id} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <label htmlFor={`edit-name-${user.id}`} className="text-sm font-medium">
            Imię i nazwisko
          </label>
          <input
            id={`edit-name-${user.id}`}
            name="full_name"
            type="text"
            defaultValue={user.full_name ?? ''}
            autoComplete="off"
            className="rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            placeholder="Jan Kowalski"
          />
        </div>

        <div className="grid gap-1.5">
          <label htmlFor={`edit-pass-${user.id}`} className="text-sm font-medium">
            Nowe hasło <span className="text-muted-foreground">(zostaw puste, aby nie zmieniać)</span>
          </label>
          <PasswordField
            id={`edit-pass-${user.id}`}
            name="password"
            minLength={8}
            autoComplete="new-password"
            placeholder="min. 8 znaków"
          />
          {state.fieldErrors?.password && (
            <span className="text-xs text-destructive">{state.fieldErrors.password}</span>
          )}
        </div>
      </div>

      {state.error && (
        <p className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
          <TriangleAlert className="size-4 shrink-0" />
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="flex items-center gap-2 rounded-xl bg-eco/15 px-3.5 py-2.5 text-sm text-eco">
          <CheckCircle2 className="size-4 shrink-0" />
          {state.success}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-input px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
          Zamknij
        </button>
        <EditSubmit />
      </div>
    </form>
  )
}

function UserItem({ user, isSelf }: { user: UserRow; isSelf: boolean }) {
  const [editing, setEditing] = useState(false)

  return (
    <li className="px-4 py-3 sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 sm:flex-1">
          <p className="flex flex-wrap items-center gap-1.5 font-medium">
            <span className="min-w-0 break-words">
              {user.full_name || user.email || 'Bez nazwy'}
            </span>
            {isSelf && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[0.65rem] font-semibold text-primary">
                <ShieldCheck className="size-3" /> To Ty
              </span>
            )}
          </p>
          {user.full_name && (
            <p className="break-words text-xs text-muted-foreground">{user.email}</p>
          )}
        </div>

        <div className="flex items-center gap-2 sm:shrink-0">
          <RoleSelect user={user} isSelf={isSelf} />

          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            aria-expanded={editing}
            aria-label={`Edytuj użytkownika ${user.email ?? ''}`}
            className={
              'flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary ' +
              (editing ? 'bg-primary/10 text-primary' : '')
            }
          >
            <Pencil className="size-4" />
          </button>

          <form action={deleteUserAction} className="ml-auto sm:ml-2">
            <input type="hidden" name="id" value={user.id} />
            <PendingIconButton
              disabled={isSelf}
              aria-label={`Usuń użytkownika ${user.email ?? ''}`}
              className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
            >
              <Trash2 className="size-4" />
            </PendingIconButton>
          </form>
        </div>
      </div>

      {editing && <EditUserPanel user={user} onClose={() => setEditing(false)} />}
    </li>
  )
}

export function UserManagement({ users, currentUserId }: { users: UserRow[]; currentUserId: string }) {
  return (
    <div className="grid gap-6">
      <AddUserForm />

      <div className="rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3 sm:px-5">
          <Users className="size-4 text-muted-foreground" />
          <h2 className="text-base font-semibold">
            Użytkownicy{' '}
            <span className="font-normal text-muted-foreground">({users.length})</span>
          </h2>
        </div>

        <ul className="divide-y divide-border">
          {users.map((u) => (
            <UserItem key={u.id} user={u} isSelf={u.id === currentUserId} />
          ))}
        </ul>
      </div>
    </div>
  )
}

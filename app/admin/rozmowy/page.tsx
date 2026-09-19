import type { Metadata } from 'next'
import { requireStaff } from '@/lib/supabase/auth'
import { groupConversations, type ChatLogRow, type ChatBanRow } from '@/lib/chat-logs'
import { ChatLogsManager } from '@/components/admin/chat-logs-manager'

export const metadata: Metadata = {
  title: 'Rozmowy z AI — panel | Jejkowice',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

/** Ile ostatnich wpisów pobieramy do podglądu (lekki log, tymczasowe rozwiązanie). */
const MAX_LOGS = 300

export default async function ChatLogsPage() {
  // Bramka roli (editor/admin) + klient sesyjny (RLS). Odczyt przechodzi przez
  // politykę chat_logs_staff_read z migracji 013.
  const { supabase } = await requireStaff()

  // Najpierw próbujemy pobrać z nowymi kolumnami (migracja 017). Jeśli ich jeszcze
  // nie ma, Supabase zwróci błąd — wtedy „fail-open" cofamy się do bazowego zestawu
  // kolumn, żeby panel działał także PRZED uruchomieniem migracji.
  let rows: ChatLogRow[] = []
  const extended = await supabase
    .from('chat_logs')
    .select('id, session_id, question, answer, created_at, ip_hash, flagged, flag_reason')
    .order('created_at', { ascending: false })
    .limit(MAX_LOGS)

  if (extended.error) {
    const base = await supabase
      .from('chat_logs')
      .select('id, session_id, question, answer, created_at')
      .order('created_at', { ascending: false })
      .limit(MAX_LOGS)
    rows = (base.data as ChatLogRow[]) ?? []
  } else {
    rows = (extended.data as ChatLogRow[]) ?? []
  }

  const conversations = groupConversations(rows)

  // Lista aktywnych/założonych banów. Gdy tabela nie istnieje (przed migracją),
  // po prostu pokazujemy pustą listę.
  const bansRes = await supabase
    .from('chat_bans')
    .select('id, ip_hash, reason, strikes, is_auto, created_at, expires_at')
    .order('created_at', { ascending: false })
  const bans = (bansRes.data as ChatBanRow[]) ?? []

  return (
    <div className="grid gap-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Rozmowy z AI</h1>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          Podgląd pytań mieszkańców i odpowiedzi asystenta AI. Wpisy możesz usuwać
          pojedynczo, całymi rozmowami lub wyczyścić wszystko.
        </p>
      </header>

      <ChatLogsManager conversations={conversations} bans={bans} />
    </div>
  )
}

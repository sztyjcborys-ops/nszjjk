import "server-only"

import { getPublishedArticles } from "@/lib/articles"
import { getPublicEvents } from "@/lib/events"
import { getPublicPolls } from "@/lib/polls"
import { getBudgetData, buildOverview } from "@/lib/budget"
import { eventLongDate, isPastEvent, importantPhones } from "@/lib/data"
import { describeWasteScheduleForAI, type SavedAddress } from "@/lib/waste-schedule"

/**
 * Buduje zwięzły kontekst z danych, które już znajdują się w aplikacji
 * (Supabase + treści statyczne). Trafia do promptu systemowego modelu, aby
 * odpowiadał na pytania o aktualności, wydarzenia i ankiety naszego serwisu.
 *
 * Wszystko owinięte w try/catch — brak danych/awaria Supabase nie może
 * wywrócić czatu, po prostu pomijamy dany fragment.
 */
export async function buildAppContext(
  question = "",
  wasteAddress: SavedAddress | null = null,
): Promise<string> {
  const sections: string[] = []

  // Harmonogram wywozu odpadów — tylko jeśli mieszkaniec zapisał adres w module
  // „Wywóz śmieci" (adres przychodzi z przeglądarki). To NASZE dane lokalne,
  // więc trafiają na początek kontekstu i mają pierwszeństwo przed źródłami web.
  if (wasteAddress) {
    try {
      sections.push(`HARMONOGRAM WYWOZU ODPADÓW (adres zapisany przez mieszkańca):\n${describeWasteScheduleForAI(wasteAddress)}`)
    } catch (error) {
      console.log("[v0] app-context waste error:", error instanceof Error ? error.message : error)
    }
  }

  try {
    // Mniej pozycji + przycięty zajawka: kontekst jedzie do Groqa w KAŻDEJ
    // rundzie, a limit to 8000 tokenów/min — długie zajawki niepotrzebnie go
    // przejadały. Cztery najnowsze z krótkim opisem w zupełności wystarczą.
    const clipExcerpt = (t: string) =>
      t.length <= 140 ? t : `${t.slice(0, 140).replace(/\s+\S*$/, "")}…`
    const articles = (await getPublishedArticles()).slice(0, 4)
    if (articles.length) {
      const lines = articles.map(
        (a) => `- „${a.title}" (${a.category}) — ${clipExcerpt(a.excerpt ?? "")} [/aktualnosci/${a.slug}]`,
      )
      sections.push(`AKTUALNOŚCI (najnowsze):\n${lines.join("\n")}`)
    }
  } catch (error) {
    console.log("[v0] app-context articles error:", error instanceof Error ? error.message : error)
  }

  try {
    // getPublicEvents zwraca wydarzenia rosnąco wg daty. Rozdzielamy je na
    // nadchodzące (od dziś w górę) i te, które już się odbyły, aby model nigdy
    // nie podał przeszłego wydarzenia jako „najbliższego".
    const allEvents = await getPublicEvents()
    // Do nagłówka (tytuł, data, miejsce) dołączamy TYLKO „minimum wiedzy" o tym,
    // czego wydarzenie dotyczy: krótkie `intro` (przycięte) + skrót `highlights`.
    // Pełnego, wieloakapitowego `description` NIE wrzucamy do promptu — to główny
    // pożeracz tokenów. Zamiast tego AI kieruje mieszkańca do sekcji [LINK:wydarzenia],
    // gdzie jest cała treść. Dzięki temu model wie, o czym było wydarzenie, ale
    // prompt pozostaje krótki niezależnie od długości opisów w bazie.
    const clip = (text: string, max: number) =>
      text.length <= max ? text : `${text.slice(0, max).replace(/\s+\S*$/, "")}…`
    const fmt = (e: (typeof allEvents)[number]) => {
      const head = `- „${e.title}" — ${eventLongDate(e)}, ${e.time}, ${e.place}${e.address ? `, ${e.address}` : ""}${e.free ? ", wstęp wolny" : ""}`
      const details: string[] = []
      if (e.intro?.trim()) details.push(clip(e.intro.trim().replace(/\s+/g, " "), 220))
      if (Array.isArray(e.highlights) && e.highlights.length) {
        // Maks. 5 punktów programu — wystarcza jako „o czym było", bez rozdęcia.
        const points = e.highlights.filter((h) => h?.trim()).slice(0, 5)
        if (points.length) details.push(`W programie: ${points.join(", ")}.`)
      }
      const desc = details.join(" ").replace(/\s+/g, " ").trim()
      return desc ? `${head}\n  W skrócie: ${desc}` : head
    }

    const upcoming = allEvents.filter((e) => !isPastEvent(e)).slice(0, 5)
    // Najświeższe przeszłe wydarzenia jako pierwsze (lista jest rosnąca → odwracamy).
    const past = allEvents.filter(isPastEvent).reverse().slice(0, 2)

    if (upcoming.length) {
      sections.push(
        `NADCHODZĄCE WYDARZENIA (najbliższe na górze — używaj ich do pytań o „najbliższe/następne" wydarzenie):\n${upcoming
          .map(fmt)
          .join("\n")}`,
      )
    } else {
      sections.push("NADCHODZĄCE WYDARZENIA: brak zaplanowanych wydarzeń.")
    }

    if (past.length) {
      sections.push(
        `WYDARZENIA, KTÓRE JUŻ SIĘ ODBYŁY (NIE podawaj ich jako nadchodzące):\n${past.map(fmt).join("\n")}`,
      )
    }
  } catch (error) {
    console.log("[v0] app-context events error:", error instanceof Error ? error.message : error)
  }

  try {
    const polls = (await getPublicPolls()).slice(0, 5)
    if (polls.length) {
      const lines = polls.map(
        (p) => `- „${p.title}" (${p.status}${p.daysLeft != null ? `, pozostało ${p.daysLeft} dni` : ""})`,
      )
      sections.push(`ANKIETY:\n${lines.join("\n")}`)
    }
  } catch (error) {
    console.log("[v0] app-context polls error:", error instanceof Error ? error.message : error)
  }

  // Budżet gminy dokładamy tylko, gdy pytanie faktycznie go dotyczy — inaczej
  // niepotrzebnie rozdmuchiwałby prompt. Dane pochodzą WYŁĄCZNIE z Supabase:
  // aktualne kwoty z budget_summary_2026, a struktura działów z budgets_2026
  // (budżet pierwotny). Tych dwóch NIE mieszamy i niczego nie przeliczamy sami.
  // Asystent AI ma dostęp do danych budżetowych niezależnie od tego, czy
  // publiczna strona /budzet jest widoczna (patrz BUDGET_PAGE_ENABLED).
  const wantsBudget =
    /budżet|budzet|wydatk|dochod|deficyt|nadwyżk|nadwyzk|finans|kasa gminy|ile.*(wyda|kosztuj|przeznacz)|na co.*(idą|ida|przeznacz)/i.test(
      question,
    )
  if (wantsBudget) {
    try {
      const { summary, budgets } = await getBudgetData()
      const overview = buildOverview(budgets, summary)
      const cur = overview.current
      const money = (n: number | null) =>
        n == null
          ? "brak danych"
          : `${new Intl.NumberFormat("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)} zł`
      const plDate = (iso: string | null) => {
        if (!iso) return null
        const d = new Date(iso)
        if (Number.isNaN(d.getTime())) return iso
        return new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", year: "numeric" }).format(d)
      }

      const lines: string[] = []
      if (cur) {
        const date = plDate(cur.resolution_date)
        lines.push(
          `AKTUALNY, POTWIERDZONY STAN BUDŻETU${date ? ` (na dzień ${date})` : ""}${
            cur.resolution_no ? `, uchwała ${cur.resolution_no}` : ""
          }:`,
          `- Dochody: ${money(cur.income != null ? Number(cur.income) : null)}`,
          `- Wydatki: ${money(cur.expenses != null ? Number(cur.expenses) : null)}`,
          `- Deficyt: ${money(cur.deficit != null ? Number(cur.deficit) : null)}`,
        )
      }
      if (overview.segments.length) {
        const top = overview.segments.slice(0, 8).map((s) => `- ${s.label}: ${money(s.amount)}`)
        lines.push(
          "",
          "STRUKTURA WYDATKÓW WG DZIAŁÓW — to BUDŻET PIERWOTNY, uchwalony 22 grudnia 2025 r. NIE mieszaj tych kwot z aktualnym stanem powyżej i NIE sumuj ich jako bieżących wydatków:",
          ...top,
        )
      }
      if (lines.length) sections.push(`BUDŻET GMINY 2026:\n${lines.join("\n")}`)
    } catch (error) {
      console.log("[v0] app-context budget error:", error instanceof Error ? error.message : error)
    }
  }

  // Telefony dodajemy do kontekstu tylko, gdy pytanie faktycznie dotyczy
  // kontaktu — inaczej model nie doklei numeru urzędu do niezwiązanej odpowiedzi.
  const wantsContact = /telefon|numer|kontakt|zadzwoni|dzwoni|godziny|otwar|czynne|urz[ąa]d|e-?mail|mail|adres/i.test(
    question,
  )
  if (wantsContact) {
    const phones = importantPhones.map((p) => `- ${p.name}: ${p.phone}`).join("\n")
    sections.push(`WAŻNE TELEFONY:\n${phones}`)
  }

  return sections.join("\n\n")
}

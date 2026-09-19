import type { Metadata } from "next"
import { PageHeader } from "@/components/shared/page-header"
import { LegalArticle, LegalSection } from "@/components/shared/legal-article"

export const metadata: Metadata = {
  title: "Polityka prywatności | Jejkowice — nasza gmina!",
  description:
    "Polityka prywatności serwisu naszejejkowice.pl — zasady dotyczące anonimowego korzystania z formularzy oraz ochrony prywatności użytkowników.",
  alternates: { canonical: "/polityka-prywatnosci" },
}

const CONTACT_EMAIL = "naszejejkowice@gmail.com"

export default function PolitykaPrywatnosciPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 md:px-6 md:py-14">
      <PageHeader
        eyebrow="Prywatność"
        title="Polityka prywatności naszejejkowice.pl"
        description="Zasady dotyczące prywatności oraz anonimowego korzystania z formularzy dostępnych w serwisie naszejejkowice.pl."
      />

      <p className="mb-8 text-sm text-muted-foreground">Obowiązuje od: 05.09.2026 r.</p>

      <LegalArticle>
        <LegalSection title="1. Informacje ogólne">
          <ol>
            <li>
              Serwis <strong>naszejejkowice.pl</strong> jest niezależnym, nieoficjalnym serwisem społecznościowym
              dotyczącym Jejkowic i okolic.
            </li>
            <li>
              Serwis umożliwia przeglądanie publikowanych treści oraz korzystanie z dostępnych formularzy bez
              konieczności tworzenia konta.
            </li>
          </ol>
        </LegalSection>

        <LegalSection title="2. Dane przekazywane przez użytkowników">
          <ol>
            <li>
              Serwis nie wymaga podawania imienia, nazwiska, adresu e-mail ani numeru telefonu w celu korzystania z jego
              funkcji.
            </li>
            <li>Formularze służą do przesyłania treści, takich jak zgłoszenia, opinie, pomysły czy zdjęcia.</li>
            <li>
              Użytkownik może dobrowolnie umieścić w treści dodatkowe informacje. Serwis nie potwierdza prawdziwości
              takich informacji.
            </li>
            <li>
              Informacje przekazywane za pośrednictwem formularzy nie są łączone z danymi pozwalającymi na identyfikację
              konkretnej osoby.
            </li>
          </ol>
        </LegalSection>

        <LegalSection title="3. Publikowane treści">
          <ol>
            <li>Przesłane materiały mogą zostać sprawdzone przed publikacją.</li>
            <li>
              Serwis może odmówić publikacji lub usunąć treść, jeżeli narusza ona Regulamin, przepisy prawa lub zasady
              działania Serwisu.
            </li>
          </ol>
        </LegalSection>

        <LegalSection title="4. Cookies i profilowanie">
          <ol>
            <li>
              Serwis nie prowadzi profilowania ani nie wykorzystuje informacji o użytkownikach do personalizowania
              reklam lub tworzenia profili użytkowników.
            </li>
          </ol>
        </LegalSection>

        <LegalSection title="5. Kontakt">
          <p>
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-primary hover:underline">
              {CONTACT_EMAIL}
            </a>
          </p>
        </LegalSection>

        <LegalSection title="6. Postanowienia końcowe">
          <ol>
            <li>Polityka prywatności obowiązuje od 05.09.2026 r.</li>
            <li>Polityka może zostać zmieniona w przypadku zmiany sposobu działania Serwisu.</li>
          </ol>
        </LegalSection>
      </LegalArticle>
    </div>
  )
}

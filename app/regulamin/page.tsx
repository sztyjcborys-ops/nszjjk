import type { Metadata } from "next"
import { PageHeader } from "@/components/shared/page-header"
import { LegalArticle, LegalSection } from "@/components/shared/legal-article"

export const metadata: Metadata = {
  title: "Regulamin | Jejkowice — nasza gmina!",
  description:
    "Regulamin serwisu naszejejkowice.pl — zasady korzystania z serwisu, anonimowego przesyłania treści przez formularze oraz moderacji.",
  alternates: { canonical: "/regulamin" },
}

const CONTACT_EMAIL = "naszejejkowice@gmail.com"

export default function RegulaminPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 md:px-6 md:py-14">
      <PageHeader
        eyebrow="Regulamin"
        title="Regulamin serwisu naszejejkowice.pl"
        description="Zasady korzystania z serwisu naszejejkowice.pl oraz przesyłania treści przez mieszkańców."
      />

      <p className="mb-8 text-sm text-muted-foreground">Obowiązuje od: 05.09.2026 r.</p>

      <LegalArticle>
        <LegalSection title="1. Postanowienia ogólne">
          <ol>
            <li>
              <strong>naszejejkowice.pl</strong> jest niezależnym, nieoficjalnym serwisem społecznościowym dotyczącym
              Jejkowic i okolic.
            </li>
            <li>
              Serwis służy do publikowania i udostępniania informacji, opinii, zgłoszeń, pomysłów, zdjęć oraz innych
              treści związanych z lokalną społecznością.
            </li>
            <li>Korzystanie z Serwisu jest bezpłatne.</li>
            <li>Serwis jest prowadzony społecznie i niezależnie od administracji samorządowej.</li>
          </ol>
        </LegalSection>

        <LegalSection title="2. Korzystanie z Serwisu">
          <ol>
            <li>Korzystanie z podstawowych funkcji Serwisu nie wymaga zakładania konta.</li>
            <li>Użytkownik może korzystać z dostępnych formularzy w celu przesyłania treści.</li>
          </ol>
        </LegalSection>

        <LegalSection title="3. Przesyłanie treści">
          <ol>
            <li>Użytkownik może przesyłać informacje, opinie, zgłoszenia, pomysły, zdjęcia oraz inne materiały.</li>
            <li>Użytkownik powinien posiadać prawa do przesyłanych zdjęć, grafik i innych materiałów.</li>
            <li>
              Nie należy przesyłać treści bezprawnych, w szczególności gróźb, nawoływania do przemocy, spamu lub treści
              naruszających prawa innych osób.
            </li>
            <li>Użytkownik powinien unikać przesyłania danych osobowych innych osób.</li>
          </ol>
        </LegalSection>

        <LegalSection title="4. Moderacja">
          <ol>
            <li>Przesłane treści mogą zostać sprawdzone przed publikacją.</li>
            <li>
              Serwis może odmówić publikacji lub usunąć treść naruszającą Regulamin, przepisy prawa lub zasady działania
              Serwisu.
            </li>
            <li>Informacje umożliwiające identyfikację osób mogą zostać pominięte podczas publikacji.</li>
            <li>Serwis nie gwarantuje prawdziwości informacji przekazywanych przez użytkowników.</li>
          </ol>
        </LegalSection>

        <LegalSection title="5. Odpowiedzialność za treści">
          <p>
            Użytkownik ponosi odpowiedzialność za przesyłane przez siebie treści w zakresie wynikającym z obowiązujących
            przepisów prawa.
          </p>
        </LegalSection>

        <LegalSection title="6. Kontakt">
          <p>
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-primary hover:underline">
              {CONTACT_EMAIL}
            </a>
          </p>
        </LegalSection>

        <LegalSection title="7. Postanowienia końcowe">
          <ol>
            <li>Korzystanie z Serwisu oznacza akceptację niniejszego Regulaminu.</li>
            <li>Regulamin obowiązuje od 05.09.2026 r.</li>
            <li>Aktualna wersja Regulaminu jest dostępna w Serwisie.</li>
            <li>Regulamin może zostać zmieniony w przypadku zmiany sposobu działania Serwisu.</li>
          </ol>
        </LegalSection>
      </LegalArticle>
    </div>
  )
}

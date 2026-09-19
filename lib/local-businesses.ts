/**
 * Dane lokalnych firm do sekcji „Wspieraj lokalnie" na stronie głównej oraz do
 * podstrony „Lokalne firmy" (/firmy).
 *
 * Na razie to dane statyczne (mock) — moduł firm nie ma jeszcze panelu ani bazy.
 * Gdy powstanie backend, wystarczy podmienić to źródło na pobieranie z bazy, a
 * komponenty (`LocalSupport`, `LocalPromosCarousel`, `FirmyExplorer`,
 * `StoryViewer`) zostają bez zmian.
 *
 * UWAGA o obrazkach: pliki w /public/images/local są w formacie .webp (po
 * kompresji szablonu). Relacje (stories) korzystają z tych samych zdjęć, więc
 * nie trzeba dokładać nowych plików.
 */

/** Pojedynczy slajd relacji (story/rolka) firmy. */
export type StorySlide = {
  id: string
  /** Zdjęcie tła slajdu (format .webp). */
  image: string
  /** Etykieta „plakietki" (np. „DRUGA PIZZA ZA 1 ZŁ!"). */
  badge: string
  /** Główny tekst na slajdzie. */
  title: string
  /** Podpis pod tytułem. */
  subtitle?: string
  /** Napis na przycisku akcji (np. „Zamów teraz"). */
  cta?: string
  /** Rozszerzony opis promocji z relacji — warunki, jak skorzystać itd. */
  details?: string
  /** Jak dawno dodano relację (np. „2 godz. temu"). */
  timeAgo: string
}

export type LocalBusiness = {
  id: string
  /** Pełna nazwa pokazywana na karcie promocji. */
  name: string
  /** Skrócona nazwa pod okrągłym awatarem (mieści się w 2 wierszach). */
  shortName: string
  category: string
  address: string
  image: string
  /** Klasa Tailwind koloru obwódki awatara (token z globals.css). */
  ring: string
  /** Etykieta plakietki na karcie promocji. */
  badge: string
  /** Kolorystyka plakietki. */
  badgeTone: 'red' | 'eco' | 'gold' | 'primary'
  offerTitle: string
  offerDesc: string
  /* --- Pola używane głównie na podstronie /firmy --- */
  /** Kilka zdań o firmie — pokazywane w sekcji „O firmie" na profilu. */
  about?: string
  /** Rozszerzony opis promocji — jak działa, warunki, do kiedy itp. */
  offerDetails?: string
  /** Krótki podpis/branża pod nazwą w profilu. */
  tagline?: string
  /** Średnia ocena (np. 4.9). */
  rating?: number
  /** Liczba opinii. */
  reviews?: number
  /** Telefon kontaktowy. */
  phone?: string
  /** Relacje (rolki) firmy — pokazywane po kliknięciu awatara. */
  stories?: StorySlide[]
}

export const localBusinesses: LocalBusiness[] = [
  {
    id: 'da-grasso',
    name: 'Pizzeria Da Grasso',
    shortName: 'Pizzeria Da Grasso',
    category: 'Gastronomia',
    address: 'ul. Strażacka 4',
    image: '/images/local/da-grasso.webp',
    ring: 'ring-destructive',
    badge: 'Oferta tygodnia',
    badgeTone: 'red',
    offerTitle: 'Druga pizza za 1 zł!',
    offerDesc: 'Zamów dowolną dużą pizzę, a drugą odbierzesz za złotówkę.',
    about:
      'Rodzinna pizzeria działająca w Jejkowicach od 2012 roku. Wypiekamy pizzę na cienkim, ręcznie wyrabianym cieście, w tradycyjnym piecu opalanym drewnem. Stawiamy na świeże, lokalne składniki — sery i warzywa kupujemy od okolicznych gospodarzy. Zapraszamy na miejscu, na wynos i z dowozem po całych Jejkowicach.',
    offerDetails:
      'Promocja działa przez cały tydzień przy zamówieniu na miejscu, na wynos i z dowozem. Zamawiasz dowolną dużą pizzę z karty, a drugą (o równej lub niższej cenie) dopłacasz tylko 1 zł. Przy zamówieniu online wpisz kod JEJKOWICE. Oferta nie łączy się z innymi promocjami i obowiązuje do końca miesiąca.',
    tagline: 'Pizza & włoska kuchnia',
    rating: 4.8,
    reviews: 126,
    phone: '32 000 00 01',
    stories: [
      {
        id: 'da-grasso-1',
        image: '/images/local/da-grasso.webp',
        badge: 'DRUGA PIZZA ZA 1 ZŁ!',
        title: 'Tylko dziś!',
        subtitle: 'Zamów online z kodem JEJKOWICE',
        details:
          'Zamów dowolną dużą pizzę online z kodem JEJKOWICE, a drugą (o równej lub niższej cenie) dorzucamy za 1 zł. Oferta ważna wyłącznie dziś, do końca dnia — liczba zamówień w promocji jest ograniczona, więc nie zwlekaj.',
        cta: 'Zamów teraz',
        timeAgo: '2 godz. temu',
      },
      {
        id: 'da-grasso-2',
        image: '/images/local/da-grasso.webp',
        badge: 'Nowość w karcie',
        title: 'Pizza z lokalnym serem',
        subtitle: 'Prosto od gospodarzy z okolicy',
        details:
          'Nowa pozycja w karcie: pizza z serem prosto od gospodarzy z okolicy. Wyrazisty smak, krótka lista składników i cienkie, ręcznie wyrabiane ciasto. Zapytaj obsługę o dostępność — nowość znajdziesz w dziale specjalności.',
        cta: 'Zobacz menu',
        timeAgo: '5 godz. temu',
      },
    ],
  },
  {
    id: 'fitness',
    name: 'Studio Fitness',
    shortName: 'Studio Fitness',
    category: 'Sport i rekreacja',
    address: 'ul. Sportowa 2',
    image: '/images/local/fitness.webp',
    ring: 'ring-eco',
    badge: 'Nowość',
    badgeTone: 'eco',
    offerTitle: 'Pierwszy trening gratis',
    offerDesc: 'Wpadnij na bezpłatny trening próbny z trenerem personalnym.',
    about:
      'Kameralne studio treningowe z pełnym zapleczem siłowni oraz salą do zajęć grupowych. Prowadzimy treningi personalne, zajęcia fitness i wsparcie dietetyczne. Nasi trenerzy układają plany dopasowane do Twojego poziomu — od pierwszych kroków po zaawansowane cele sylwetkowe. Otwarte codziennie od 6:00 do 22:00.',
    offerDetails:
      'Nowe osoby umawiają bezpłatny trening próbny z trenerem personalnym — poznasz sprzęt, wykonasz analizę składu ciała i ułożysz wstępny plan. Wystarczy zadzwonić lub wpaść osobiście, by wybrać termin. Po treningu próbnym możesz skorzystać z 7 dni karnetu open bez opłat i bez zobowiązań.',
    tagline: 'Siłownia i zajęcia grupowe',
    rating: 4.9,
    reviews: 74,
    phone: '32 000 00 02',
    stories: [
      {
        id: 'fitness-1',
        image: '/images/local/fitness.webp',
        badge: '7 DNI GRATIS',
        title: 'Wskocz w formę',
        subtitle: 'Tydzień treningów bez opłat dla nowych osób',
        details:
          'Nowe osoby dostają 7 dni karnetu open zupełnie za darmo — pełny dostęp do siłowni oraz zajęć grupowych, bez zobowiązań i bez podawania karty. Wystarczy zadzwonić lub wpaść osobiście, a my aktywujemy tydzień treningów od ręki.',
        cta: 'Odbierz karnet',
        timeAgo: '1 dzień temu',
      },
    ],
  },
  {
    id: 'figura',
    name: 'Salon Fryzjerski Figura',
    shortName: 'Salon Figura',
    category: 'Zdrowie i uroda',
    address: 'ul. Główna 28',
    image: '/images/local/figura.webp',
    ring: 'ring-chart-7',
    badge: '-15%',
    badgeTone: 'red',
    offerTitle: 'Nowy kolor, nowa Ty!',
    offerDesc: '-15% na koloryzację przez cały październik.',
    about:
      'Salon fryzjerski dla całej rodziny prowadzony przez doświadczone stylistki. Specjalizujemy się w koloryzacji, strzyżeniu damskim i męskim oraz stylizacjach okolicznościowych. Pracujemy na profesjonalnych, pielęgnacyjnych kosmetykach i zawsze zaczynamy od konsultacji, by dobrać efekt idealnie do Ciebie.',
    offerDetails:
      'Przez cały październik na wszystkie usługi koloryzacji obowiązuje rabat 15%. Promocja dotyczy farbowania, refleksów, sombre i baleyage. Wystarczy umówić wizytę telefonicznie i wspomnieć o promocji jesiennej. Rabat naliczamy na miejscu; nie łączy się z pakietami i kartami stałego klienta.',
    tagline: 'Fryzjerstwo i stylizacja',
    rating: 4.9,
    reviews: 48,
    phone: '32 000 00 03',
    stories: [
      {
        id: 'figura-1',
        image: '/images/local/figura.webp',
        badge: '-15% NA KOLORYZACJĘ',
        title: 'Jesień w nowym kolorze',
        subtitle: 'Promocja przez cały październik',
        details:
          'Przez cały październik -15% na całą koloryzację: farbowanie, refleksy, sombre i baleyage. Zaczynamy od konsultacji, by dobrać odcień idealnie do Ciebie. Umów wizytę telefonicznie i wspomnij o promocji jesiennej — rabat naliczymy na miejscu.',
        cta: 'Umów wizytę',
        timeAgo: '3 godz. temu',
      },
    ],
  },
  {
    id: 'u-ani',
    name: 'Sklep u Ani',
    shortName: 'Sklep u Ani',
    category: 'Zakupy',
    address: 'ul. Rynek 5',
    image: '/images/local/u-ani.webp',
    ring: 'ring-gold',
    badge: 'Promocja',
    badgeTone: 'gold',
    offerTitle: 'Świeże pieczywo -20%',
    offerDesc: 'Codziennie rano świeże wypieki od lokalnej piekarni.',
    about:
      'Osiedlowy sklep spożywczy, w którym każdy jest po imieniu. Prowadzimy szeroki wybór produktów codziennego użytku, nabiał od lokalnych dostawców i świeże wypieki z okolicznej piekarni. Dbamy o krótkie łańcuchy dostaw i wspieramy gospodarzy z Jejkowic oraz sąsiednich wsi.',
    offerDetails:
      'Każdego ranka pierwsza dostawa świeżego pieczywa objęta jest rabatem 20% do wyczerpania zapasów. Chleby, bułki i drożdżówki trafiają na półki od 6:00 prosto z lokalnej piekarni. Nie trzeba kodów ani kart — obniżoną cenę widać już przy kasie. Zapraszamy szczególnie rano, gdy wybór jest największy.',
    tagline: 'Osiedlowy sklep spożywczy',
    rating: 4.7,
    reviews: 92,
    phone: '32 000 00 04',
    stories: [
      {
        id: 'u-ani-1',
        image: '/images/local/u-ani.webp',
        badge: 'ŚWIEŻE PIECZYWO -20%',
        title: 'Rano prosto z pieca',
        subtitle: 'Codziennie od 6:00',
        details:
          'Pierwsza poranna dostawa pieczywa każdego dnia objęta jest rabatem -20% do wyczerpania zapasów. Chleby, bułki i drożdżówki trafiają na półki od 6:00 prosto z lokalnej piekarni. Bez kodów i kart — obniżoną cenę widać już przy kasie.',
        cta: 'Zobacz ofertę',
        timeAgo: '8 godz. temu',
      },
    ],
  },
  {
    id: 'auto',
    name: 'Auto Serwis Kowalski',
    shortName: 'Auto Serwis',
    category: 'Motoryzacja',
    address: 'ul. Przemysłowa 12',
    image: '/images/local/auto.webp',
    ring: 'ring-navy',
    badge: 'Sezon opon',
    badgeTone: 'primary',
    offerTitle: 'Przegląd przed zimą',
    offerDesc: 'Kompleksowy przegląd i wymiana opon w promocyjnej cenie.',
    about:
      'Lokalny warsztat samochodowy z wieloletnim doświadczeniem w mechanice i wulkanizacji. Wykonujemy przeglądy, naprawy bieżące, diagnostykę komputerową oraz sezonową wymianę i przechowywanie opon. Zanim zaczniemy pracę, zawsze przedstawiamy wycenę — bez niespodzianek na fakturze.',
    offerDetails:
      'Pakiet „przed zimą" obejmuje kontrolę hamulców, zawieszenia, akumulatora i płynów oraz wymianę opon na zimowe w jednej promocyjnej cenie. Możliwe przechowanie opon letnich w naszym magazynie. Termin rezerwujesz telefonicznie; przy większym obłożeniu proponujemy najbliższy wolny slot. Oferta obowiązuje przez cały sezon opon.',
    tagline: 'Mechanika i wulkanizacja',
    rating: 4.8,
    reviews: 61,
    phone: '32 000 00 05',
    stories: [
      {
        id: 'auto-1',
        image: '/images/local/auto.webp',
        badge: 'SEZON OPON',
        title: 'Przegląd przed zimą',
        subtitle: 'Wymiana opon w promocyjnej cenie',
        details:
          'Pakiet „przed zimą" to kontrola hamulców, zawieszenia, akumulatora i płynów oraz wymiana opon na zimowe w jednej promocyjnej cenie. Możliwe przechowanie opon letnich w naszym magazynie. Termin rezerwujesz telefonicznie — zawsze najpierw podajemy wycenę.',
        cta: 'Zarezerwuj termin',
        timeAgo: '1 dzień temu',
      },
    ],
  },
]

/** Zwraca firmę po jej identyfikatorze (slug w adresie /firmy/[id]). */
export function getBusinessById(id: string): LocalBusiness | undefined {
  return localBusinesses.find((b) => b.id === id)
}

/** Kolejność i etykiety filtrów kategorii na podstronie /firmy. */
export const businessCategories = [
  'Wszystko',
  'Gastronomia',
  'Zdrowie i uroda',
  'Sport i rekreacja',
  'Zakupy',
  'Motoryzacja',
] as const

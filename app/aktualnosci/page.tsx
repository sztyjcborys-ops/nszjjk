import type { Metadata } from "next"
import { PageHeader } from "@/components/shared/page-header"
import { NewsList } from "@/components/news/news-list"
import { getPublishedArticles, articleToNewsItem } from "@/lib/articles"

export const metadata: Metadata = {
  title: "Aktualności | Jejkowice — nasza gmina!",
  description: "Najnowsze informacje, inwestycje, wydarzenia sportowe i komunikaty z gminy Jejkowice.",
}

export const revalidate = 300

export default async function AktualnosciPage() {
  const articles = await getPublishedArticles()
  const items = articles.map(articleToNewsItem)

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6 md:py-14">
      <PageHeader
        eyebrow="Aktualności"
        title="Co nowego w Jejkowicach?"
        description="Bądź na bieżąco z inwestycjami, wydarzeniami i komunikatami z życia naszej gminy."
      />
      <NewsList items={items} />
    </div>
  )
}

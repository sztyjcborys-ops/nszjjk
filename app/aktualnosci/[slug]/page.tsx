import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import {
  getArticleBySlug,
  getPublishedArticles,
  formatArticleDate,
  formatArticleTime,
  articleToNewsItem,
} from '@/lib/articles'
import { ArticleView } from '@/components/news/article-view'
import { NewsCard } from '@/components/shared/news-card'

type Params = { params: Promise<{ slug: string }> }

export const revalidate = 300

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const article = await getArticleBySlug(slug)
  if (!article) return { title: 'Artykuł | Jejkowice — nasza gmina!' }
  return {
    title: `${article.title} | Jejkowice — nasza gmina!`,
    description: article.excerpt,
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: 'article',
      images: article.cover_image ? [{ url: article.cover_image }] : undefined,
    },
  }
}

export default async function ArticlePage({ params }: Params) {
  const { slug } = await params
  const article = await getArticleBySlug(slug)
  if (!article) notFound()

  const related = (await getPublishedArticles())
    .filter((a) => a.slug !== article.slug && a.category === article.category)
    .slice(0, 3)
    .map(articleToNewsItem)

  return (
    <>
      <ArticleView
        title={article.title}
        excerpt={article.excerpt}
        category={article.category}
        coverImage={article.cover_image}
        contentHtml={article.content}
        gallery={article.gallery}
        date={formatArticleDate(article.created_at)}
        time={formatArticleTime(article.created_at)}
        author={article.author ?? undefined}
      />

      {related.length > 0 && (
        <section className="mx-auto w-full max-w-3xl px-4 pb-10 md:px-6">
          <div className="border-t border-border pt-8 md:pt-10">
            <h2 className="mb-5 text-lg font-bold md:text-xl">Podobne aktualności</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <NewsCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  )
}

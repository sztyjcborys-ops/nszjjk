import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getBusinessById } from '@/lib/local-businesses'
import { BusinessProfile } from '@/components/firmy/business-profile'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const biz = getBusinessById(id)
  if (!biz) return { title: 'Firma | Jejkowice — nasza gmina!' }
  return {
    title: `${biz.name} | Lokalne firmy — Jejkowice`,
    description: `${biz.name} — ${biz.tagline ?? biz.category}. ${biz.offerTitle}`,
  }
}

export default async function BusinessProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const biz = getBusinessById(id)
  if (!biz) notFound()

  return <BusinessProfile biz={biz} />
}

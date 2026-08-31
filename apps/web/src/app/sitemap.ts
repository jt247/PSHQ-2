import type { MetadataRoute } from 'next'
import { createServiceClient } from '@pshq/api-client/server'
import { SITE_URL } from '@/lib/seo/constants'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const service = createServiceClient()

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/about`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/articles`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/library`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/initiatives`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/initiatives/product-lab-with-jt`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/initiatives/product-case-library`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/initiatives/open-pm-curriculum`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/contact`, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${SITE_URL}/sign-up`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/sign-in`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/privacy-policy`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/terms`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/cookie-policy`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/refund-policy`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/data-deletion`, changeFrequency: 'yearly', priority: 0.2 },
  ]

  const { data: articles } = await service
    .from('content')
    .select('slug, updated_at, published_at')
    .eq('type', 'article')
    .eq('status', 'published')

  const { data: resources } = await service
    .from('content')
    .select('slug, updated_at, published_at, type')
    .in('type', ['ebook', 'template', 'course'])
    .eq('status', 'published')

  const articlePages: MetadataRoute.Sitemap = (articles ?? []).map(a => ({
    url: `${SITE_URL}/articles/${a.slug}`,
    lastModified: a.updated_at ?? a.published_at ?? undefined,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  const resourcePages: MetadataRoute.Sitemap = (resources ?? []).map(r => ({
    url: `${SITE_URL}/content/${r.slug}`,
    lastModified: r.updated_at ?? r.published_at ?? undefined,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  return [...staticPages, ...articlePages, ...resourcePages]
}

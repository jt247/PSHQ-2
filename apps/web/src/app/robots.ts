import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo/constants'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // /admin no longer exists on this domain — it's a separate app/deployment now.
      disallow: ['/dashboard', '/auth', '/api'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}

// Single source of truth for SEO / AEO / GEO metadata across the site.
// Keeping author bio, org info, and social links here means every schema
// and byline stays consistent — that consistency is itself a citation
// signal for AI answer engines, not just a DRY convenience.

export const SITE_URL = 'https://www.productslicehq.com'
export const SITE_NAME = 'Product Slice HQ'
export const SITE_TAGLINE = 'Practical Product Thinking'
// TODO(design input needed): no branded 1200x630 OG image exists yet —
// falling back to the SVG logo, which social platforms render
// inconsistently (some ignore SVG entirely). Add public/og-default.png
// and swap this over once designed.
export const DEFAULT_OG_IMAGE = `${SITE_URL}/pshq-logo.svg`

export const ORG = {
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/pshq-logo.svg`,
  description:
    'Product Slice HQ is a free learning platform for product managers, designers, founders, and tech professionals — articles, ebooks, templates, playbooks, and live cohort programs.',
}

// @jtofproduct across Instagram, Facebook, X, TikTok, Threads.
// @productslicehq as the brand handle where it differs.
export const SOCIAL_LINKS = [
  'https://instagram.com/jtofproduct',
  'https://facebook.com/jtofproduct',
  'https://x.com/jtofproduct',
  'https://tiktok.com/@jtofproduct',
  'https://threads.net/@jtofproduct',
  'https://instagram.com/productslicehq',
  'https://facebook.com/productslicehq',
  'https://x.com/productslicehq',
  'https://tiktok.com/@productslicehq',
  'https://threads.net/@productslicehq',
]

export const AUTHOR = {
  name: 'Joshua Theophilus',
  jobTitle: 'AI Technical and Growth Product Manager',
  url: 'https://joshuatheophilus.com',
  adpListUrl: 'https://adplist.org/mentors/joshua-theophilus',
  // Kept identical everywhere it's used — bylines, Person schema, /about —
  // consistency is what makes an AI tool treat this as a real, citable author.
  bio: 'Joshua Theophilus is an AI Technical and Growth Product Manager, a Top 1% mentor on ADPList, and a former Meta Lead Trainer. He has trained and mentored 50,000+ professionals across 65+ countries and founded Product Slice HQ to teach practical, AI-assisted product development.',
  shortBio: 'Top 1% mentor on ADPList · Ex-Meta Lead Trainer · 50,000+ professionals trained across 65+ countries.',
  sameAs: [
    'https://joshuatheophilus.com',
    'https://adplist.org/mentors/joshua-theophilus',
    'https://github.com/jt247',
    ...SOCIAL_LINKS.filter(l => l.includes('jtofproduct')),
  ],
}

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

// JSON-LD schema builders. Each function returns a plain object matching
// schema.org — render it via <JsonLd data={...} /> (src/components/seo/JsonLd.tsx).
import { SITE_URL, SITE_NAME, ORG, AUTHOR, absoluteUrl } from './constants'

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: ORG.name,
    url: ORG.url,
    logo: ORG.logo,
    description: ORG.description,
    sameAs: AUTHOR.sameAs,
  }
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/library?search={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  }
}

export function personSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: AUTHOR.name,
    jobTitle: AUTHOR.jobTitle,
    url: AUTHOR.url,
    description: AUTHOR.bio,
    sameAs: AUTHOR.sameAs,
    worksFor: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
  }
}

export function breadcrumbSchema(items: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }
}

export function articleSchema(opts: {
  headline: string
  description: string | null
  image: string | null
  path: string
  datePublished: string | null
  dateModified: string | null
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: opts.headline,
    description: opts.description ?? undefined,
    image: opts.image ?? undefined,
    url: absoluteUrl(opts.path),
    datePublished: opts.datePublished ?? undefined,
    dateModified: opts.dateModified ?? opts.datePublished ?? undefined,
    author: { '@type': 'Person', name: AUTHOR.name, url: AUTHOR.url },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: { '@type': 'ImageObject', url: ORG.logo },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': absoluteUrl(opts.path) },
  }
}

export function digitalDocumentSchema(opts: {
  name: string
  description: string | null
  image: string | null
  path: string
  datePublished: string | null
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'DigitalDocument',
    name: opts.name,
    description: opts.description ?? undefined,
    image: opts.image ?? undefined,
    url: absoluteUrl(opts.path),
    datePublished: opts.datePublished ?? undefined,
    author: { '@type': 'Person', name: AUTHOR.name, url: AUTHOR.url },
    inLanguage: 'en',
    isAccessibleForFree: true,
    publisher: { '@type': 'Organization', name: SITE_NAME },
  }
}

export function faqPageSchema(qa: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: qa.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  }
}

export function eventSchema(opts: {
  name: string
  description: string | null
  path: string
  startDate: string | null
  eventStatus?: 'EventScheduled' | 'EventPostponed' | 'EventCancelled'
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: opts.name,
    description: opts.description ?? undefined,
    url: absoluteUrl(opts.path),
    startDate: opts.startDate ?? undefined,
    eventStatus: `https://schema.org/${opts.eventStatus ?? 'EventScheduled'}`,
    eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
    location: { '@type': 'VirtualLocation', url: absoluteUrl(opts.path) },
    organizer: { '@type': 'Person', name: AUTHOR.name, url: AUTHOR.url },
  }
}

export function courseSchema(opts: {
  name: string
  description: string | null
  path: string
  courseStatus?: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: opts.name,
    description: opts.description ?? undefined,
    url: absoluteUrl(opts.path),
    provider: { '@type': 'Organization', name: SITE_NAME, sameAs: SITE_URL },
  }
}

export function educationalOrgSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: SITE_NAME,
    url: SITE_URL,
    description: ORG.description,
    sameAs: AUTHOR.sameAs,
  }
}

import { router } from 'expo-router'

// Shared tap handler for any dashboard content row (Continue Learning,
// Recommended, New For You, Saved, Recently Viewed) — mirrors the
// itemAction logic already in (tabs)/library.tsx. One implementation
// instead of duplicating this per section.
//
// Epic I Step 1 — ebooks/templates/courses used to fetch file_url here and
// open it externally, with no in-app screen at all (Step 0's biggest MVP
// gap). They now route to the real /content/[slug] detail screen, which
// itself offers Open + offline download.
export interface NavItem {
  id: string
  type: string
  slug: string
}

export async function openContentItem(item: NavItem): Promise<void> {
  switch (item.type) {
    case 'article':
      router.push(`/articles/${item.slug}` as never)
      return
    case 'build_note':
      router.push(`/build-notes/${item.slug}` as never)
      return
    case 'case':
      router.push(`/cases/${item.slug}` as never)
      return
    case 'collection':
      router.push(`/collections/${item.slug}` as never)
      return
    default: // ebook / template / course / guide
      router.push(`/content/${item.slug}` as never)
  }
}

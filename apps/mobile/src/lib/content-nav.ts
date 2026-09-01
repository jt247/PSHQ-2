import { router } from 'expo-router'
import { Linking, Alert } from 'react-native'
import { supabase } from '@/lib/supabase'

// Shared tap handler for any dashboard content row (Continue Learning,
// Recommended, New For You, Saved, Recently Viewed) — mirrors the
// itemAction logic already in (tabs)/library.tsx: articles/build_notes/
// cases/collections have real in-app screens, ebooks/templates are PDFs
// with no in-app viewer yet, so those open in the system browser. One
// implementation instead of duplicating this per section.
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
    default: {
      // ebook / template / course — fetch file_url, open externally.
      const { data } = await supabase.from('content').select('file_url').eq('id', item.id).maybeSingle()
      const fileUrl = (data as { file_url: string | null } | null)?.file_url
      if (!fileUrl) {
        Alert.alert('Not available yet', 'This resource doesn’t have a file attached yet.')
        return
      }
      const canOpen = await Linking.canOpenURL(fileUrl)
      if (!canOpen) {
        Alert.alert('Could not open file', 'This resource could not be opened on your device.')
        return
      }
      await Linking.openURL(fileUrl)
    }
  }
}

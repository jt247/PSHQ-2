import { Pressable, StyleSheet } from 'react-native'
import { ThemedText } from '@/components/themed-text'
import { openContentItem, type NavItem } from '@/lib/content-nav'

const TYPE_LABELS: Record<string, string> = {
  article: 'Article', ebook: 'E-book', template: 'Template', course: 'Course',
  guide: 'Guide', build_note: 'Build Note', case: 'Case Study', collection: 'Collection',
}

interface Props extends NavItem {
  title: string
}

// Shared row for the several dashboard list sections on the Profile tab
// (Continue Learning, Recommended, New For You, Saved, Recently Viewed) —
// one implementation so a styling change lands everywhere at once.
export function ContentRow({ title, ...item }: Props) {
  return (
    <Pressable style={styles.row} onPress={() => openContentItem(item)}>
      <ThemedText type="smallBold" style={styles.type}>{TYPE_LABELS[item.type] ?? item.type}</ThemedText>
      <ThemedText type="default" style={styles.title} numberOfLines={2}>{title}</ThemedText>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, marginBottom: 8 },
  type: { opacity: 0.5, fontSize: 11, textTransform: 'uppercase', marginBottom: 4 },
  title: { fontWeight: '600' },
})

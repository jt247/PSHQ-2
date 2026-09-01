import { ScrollView, Pressable, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { ThemedView } from '@/components/themed-view'
import { ThemedText } from '@/components/themed-text'

const SECTIONS = [
  { key: 'learning-paths', title: 'Learning Paths', description: 'Ordered routes toward a specific outcome.' },
  { key: 'collections', title: 'Collections', description: 'Curated resource bundles, no fixed order.' },
  { key: 'cases', title: 'Product Cases', description: 'Real teardowns of how products actually got built.' },
] as const

export default function LearnScreen() {
  return (
    <ThemedView style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container}>
        <ThemedText type="title" style={styles.title}>Learn</ThemedText>
        {SECTIONS.map(s => (
          <Pressable key={s.key} onPress={() => router.push(`/${s.key}` as never)} style={styles.card}>
            <ThemedText type="smallBold" style={styles.cardTitle}>{s.title}</ThemedText>
            <ThemedText type="small" style={styles.cardDescription}>{s.description}</ThemedText>
          </Pressable>
        ))}
      </ScrollView>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 20, gap: 12 },
  title: { fontSize: 22, marginBottom: 8 },
  card: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 18 },
  cardTitle: { marginBottom: 4 },
  cardDescription: { opacity: 0.7 },
})

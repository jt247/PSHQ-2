import { useEffect, useState } from 'react'
import { ScrollView, Pressable, StyleSheet, ActivityIndicator, Image } from 'react-native'
import { router } from 'expo-router'
import { ThemedView } from '@/components/themed-view'
import { ThemedText } from '@/components/themed-text'
import { MemberDashboard } from '@/components/member-dashboard'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Brand } from '@/constants/brand'

interface Card { id: string; title: string; slug: string; summary: string | null; type?: string }

const DOMAINS = [
  { slug: 'product', label: 'Product', image: require('../../../assets/illustrations/direction-product.jpg') },
  { slug: 'growth', label: 'Growth', image: require('../../../assets/illustrations/direction-growth.jpg') },
  { slug: 'ai', label: 'AI', image: require('../../../assets/illustrations/direction-ai.jpg') },
  { slug: 'building', label: 'Building', image: require('../../../assets/illustrations/direction-building.jpg') },
  { slug: 'careers', label: 'Careers', image: require('../../../assets/illustrations/direction-careers.jpg') },
  { slug: 'leadership', label: 'Leadership', image: require('../../../assets/illustrations/direction-leadership.jpg') },
]

// Design Brief §5 — Home is the member dashboard for a signed-in user
// (moved here from Profile, see member-dashboard.tsx). A signed-out
// visitor still gets the marketing browse experience below — that's the
// actual first-run content for someone who hasn't joined yet, per §4.
export default function HomeScreen() {
  const { session } = useAuth()
  if (session) return <MemberDashboard />
  return <MarketingHome />
}

function MarketingHome() {
  const [loading, setLoading] = useState(true)
  const [paths, setPaths] = useState<Card[]>([])
  const [notes, setNotes] = useState<Card[]>([])
  const [cases, setCases] = useState<Card[]>([])

  useEffect(() => {
    async function load() {
      const [{ data: pathData }, { data: noteData }, { data: caseData }] = await Promise.all([
        supabase.from('learning_paths').select('id, slug, title, description').eq('status', 'published').order('display_order').limit(3),
        supabase.from('content').select('id, slug, title, summary').eq('status', 'published').eq('type', 'build_note').order('published_at', { ascending: false }).limit(3),
        supabase.from('case_library_entries').select('id, slug, title, company_name').eq('status', 'published').not('slug', 'is', null).limit(3),
      ])
      setPaths((pathData ?? []).map(p => ({ id: p.id, title: p.title, slug: p.slug, summary: p.description })))
      setNotes((noteData ?? []).map(n => ({ id: n.id, title: n.title, slug: n.slug, summary: n.summary })))
      setCases((caseData ?? []).map(c => ({ id: c.id, title: c.title, slug: c.slug, summary: c.company_name })))
      setLoading(false)
    }
    load()
  }, [])

  return (
    <ThemedView style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Hero */}
        <ThemedView style={styles.hero}>
          <ThemedText type="title" style={styles.heroTitle}>
            Practical knowledge for people building technology products.
          </ThemedText>
          <ThemedText type="default" style={styles.heroSubtitle}>
            Learn product, growth, AI, technology, startup execution, and leadership from real-world practice.
          </ThemedText>
          <Pressable onPress={() => router.push('/sign-up')} style={styles.heroButton}>
            <ThemedText style={styles.heroButtonText}>Start Learning Free →</ThemedText>
          </Pressable>
        </ThemedView>

        {/* Choose Your Direction — Design Brief §4.2: a small illustration
         * per direction instead of plain text, one accent color each. */}
        <Section title="Choose Your Direction">
          <ThemedView style={styles.domainGrid}>
            {DOMAINS.map(d => (
              <Pressable key={d.slug} onPress={() => router.push(`/explore/${d.slug}` as never)} style={styles.domainCard}>
                <Image source={d.image} style={styles.domainImage} resizeMode="cover" />
                <ThemedText type="smallBold" style={styles.domainLabel}>{d.label}</ThemedText>
              </Pressable>
            ))}
          </ThemedView>
        </Section>

        {loading ? <ActivityIndicator style={styles.loader} /> : (
          <>
            {paths.length > 0 && (
              <Section title="Start With a Learning Path" onSeeAll={() => router.push('/learning-paths')}>
                {paths.map(p => <CardRow key={p.id} card={p} onPress={() => router.push(`/learning-paths/${p.slug}` as never)} />)}
              </Section>
            )}

            {notes.length > 0 && (
              <Section title="JT Build Notes" onSeeAll={() => router.push('/build-notes' as never)}>
                {notes.map(n => <CardRow key={n.id} card={n} onPress={() => router.push(`/build-notes/${n.slug}` as never)} />)}
              </Section>
            )}

            {cases.length > 0 && (
              <Section title="Product Case Library" onSeeAll={() => router.push('/cases' as never)}>
                {cases.map(c => <CardRow key={c.id} card={c} onPress={() => router.push(`/cases/${c.slug}` as never)} />)}
              </Section>
            )}
          </>
        )}

        {/* Final CTA */}
        <ThemedView style={styles.finalCta}>
          <ThemedText type="smallBold" style={styles.finalCtaTitle}>Build better products. Learn from practice.</ThemedText>
          <Pressable onPress={() => router.push('/sign-up')} style={styles.heroButton}>
            <ThemedText style={styles.heroButtonText}>Join ProductSlice Free →</ThemedText>
          </Pressable>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  )
}

function Section({ title, onSeeAll, children }: { title: string; onSeeAll?: () => void; children: React.ReactNode }) {
  return (
    <ThemedView style={styles.section}>
      <ThemedView style={styles.sectionHeader}>
        <ThemedText type="smallBold" style={styles.sectionTitle}>{title}</ThemedText>
        {onSeeAll && (
          <Pressable onPress={onSeeAll}><ThemedText type="small" style={styles.seeAll}>See all →</ThemedText></Pressable>
        )}
      </ThemedView>
      {children}
    </ThemedView>
  )
}

function CardRow({ card, onPress }: { card: Card; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <ThemedText type="default" style={styles.cardTitle}>{card.title}</ThemedText>
      {card.summary && <ThemedText type="small" style={styles.cardSummary} numberOfLines={2}>{card.summary}</ThemedText>}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { paddingBottom: 48 },
  hero: { padding: 24, paddingTop: 32, gap: 12, backgroundColor: Brand.navy },
  heroTitle: { fontSize: 26, lineHeight: 32, color: Brand.cream },
  heroSubtitle: { color: Brand.mutedOnNavy, lineHeight: 22 },
  heroButton: { backgroundColor: Brand.gold, borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  heroButtonText: { color: Brand.navy, fontWeight: '700' },
  loader: { marginTop: 24 },
  section: { paddingHorizontal: 24, marginTop: 28 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16 },
  seeAll: { opacity: 0.6 },
  domainGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  domainCard: { width: '31%', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: Brand.hairline },
  domainImage: { width: '100%', height: 70 },
  domainLabel: { textAlign: 'center', paddingVertical: 8 },
  card: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 14, marginBottom: 10 },
  cardTitle: { fontWeight: '600', marginBottom: 4 },
  cardSummary: { opacity: 0.7 },
  finalCta: { margin: 24, marginTop: 32, padding: 24, backgroundColor: Brand.navy, borderRadius: 12, alignItems: 'center', gap: 8 },
  finalCtaTitle: { color: Brand.cream, textAlign: 'center', marginBottom: 8 },
})

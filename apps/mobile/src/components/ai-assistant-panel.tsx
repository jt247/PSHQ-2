import { useState } from 'react'
import { Modal, View, Pressable, ScrollView, ActivityIndicator, StyleSheet } from 'react-native'
import { ThemedText } from '@/components/themed-text'
import { ThemedView } from '@/components/themed-view'
import { callApi } from '@/lib/api'

type AssistanceAction = 'key_takeaways' | 'action_checklist' | 'reflection_questions'
type TabKey = 'summary' | AssistanceAction

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'summary', label: 'Summary' },
  { key: 'key_takeaways', label: 'Takeaways' },
  { key: 'action_checklist', label: 'Checklist' },
  { key: 'reflection_questions', label: 'Reflect' },
]

interface SummaryData { summary: string; bullets: string[]; concepts: string[] }

// Epic E §E.9-E.13 mobile parity — same unified panel as web's
// AiSummaryPanel.tsx: one entry point, tabs inside, not four scattered
// buttons. Calls the same API routes web does, via callApi's Bearer-token
// auth (see apps/mobile/src/lib/api.ts).
export function AiAssistantButton({ contentId }: { contentId: string }) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<TabKey>('summary')
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [assistance, setAssistance] = useState<Partial<Record<AssistanceAction, string[]>>>({})
  const [loadingTab, setLoadingTab] = useState<TabKey | null>(null)
  const [errors, setErrors] = useState<Partial<Record<TabKey, string>>>({})

  async function loadSummary() {
    if (summary) return
    setLoadingTab('summary')
    try {
      const cacheRes = await callApi(`/api/ai-summary/${contentId}`)
      const cacheJson = await cacheRes.json()
      if (cacheJson.cached) { setSummary({ summary: cacheJson.summary, bullets: cacheJson.bullets ?? [], concepts: cacheJson.concepts ?? [] }); return }

      const res = await callApi(`/api/ai-summary/${contentId}`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) setErrors(prev => ({ ...prev, summary: json.error ?? 'Failed to generate summary.' }))
      else setSummary({ summary: json.summary, bullets: json.bullets ?? [], concepts: json.concepts ?? [] })
    } catch {
      setErrors(prev => ({ ...prev, summary: 'Something went wrong.' }))
    } finally {
      setLoadingTab(null)
    }
  }

  async function loadAssistance(action: AssistanceAction, key: string) {
    if (assistance[action]) return
    setLoadingTab(action)
    try {
      const res = await callApi(`/api/ai/content-assistance/${contentId}?action=${action}`, { method: 'POST' })
      const json = await res.json()
      if (json.insufficientContent) setErrors(prev => ({ ...prev, [action]: json.message }))
      else if (!res.ok) setErrors(prev => ({ ...prev, [action]: json.error ?? 'Failed to generate.' }))
      else setAssistance(prev => ({ ...prev, [action]: json.output?.[key] ?? [] }))
    } catch {
      setErrors(prev => ({ ...prev, [action]: 'Something went wrong.' }))
    } finally {
      setLoadingTab(null)
    }
  }

  function selectTab(next: TabKey) {
    setTab(next)
    if (next === 'summary') loadSummary()
    else if (next === 'key_takeaways') loadAssistance('key_takeaways', 'takeaways')
    else if (next === 'action_checklist') loadAssistance('action_checklist', 'checklist')
    else if (next === 'reflection_questions') loadAssistance('reflection_questions', 'questions')
  }

  function handleOpen() {
    setOpen(true)
    selectTab('summary')
  }

  return (
    <>
      <Pressable style={styles.trigger} onPress={handleOpen}>
        <ThemedText style={styles.triggerText}>✨ AI Assistant</ThemedText>
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
            <View style={styles.header}>
              <ThemedText type="subtitle">AI Assistant</ThemedText>
              <Pressable onPress={() => setOpen(false)}><ThemedText style={styles.closeText}>×</ThemedText></Pressable>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
              {TABS.map(t => (
                <Pressable key={t.key} onPress={() => selectTab(t.key)} style={[styles.tabChip, tab === t.key && styles.tabChipActive]}>
                  <ThemedText style={tab === t.key ? styles.tabTextActive : styles.tabText}>{t.label}</ThemedText>
                </Pressable>
              ))}
            </ScrollView>

            <ScrollView style={styles.body}>
              {loadingTab === tab && <ActivityIndicator style={{ marginTop: 12 }} />}
              {errors[tab] && !loadingTab && <ThemedText type="small" style={styles.errorText}>{errors[tab]}</ThemedText>}

              {tab === 'summary' && summary && !loadingTab && (
                <View>
                  <ThemedText type="default" style={styles.paragraph}>{summary.summary}</ThemedText>
                  {summary.bullets.length > 0 && <BulletList label="Key Points" items={summary.bullets} />}
                  {summary.concepts.length > 0 && <BulletList label="Key Concepts" items={summary.concepts} />}
                </View>
              )}

              {tab !== 'summary' && assistance[tab] && !loadingTab && (
                <BulletList
                  label={tab === 'key_takeaways' ? 'Key Takeaways' : tab === 'action_checklist' ? 'Checklist' : 'Questions'}
                  items={assistance[tab] ?? []}
                />
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}

function BulletList({ label, items }: { label: string; items: string[] }) {
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" style={styles.sectionLabel}>{label}</ThemedText>
      {items.map((item, i) => (
        <ThemedText key={i} type="small" style={styles.bulletItem}>• {item}</ThemedText>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  trigger: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginBottom: 12 },
  triggerText: { fontWeight: '600' },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, maxHeight: '80%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  closeText: { fontSize: 20, color: '#374151' },
  tabRow: { gap: 8, marginBottom: 12 },
  tabChip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  tabChipActive: { backgroundColor: '#111827', borderColor: '#111827' },
  tabText: { fontSize: 13, color: '#374151' },
  tabTextActive: { fontSize: 13, color: '#fff' },
  body: { minHeight: 100 },
  paragraph: { marginBottom: 12, lineHeight: 20 },
  section: { marginBottom: 12 },
  sectionLabel: { marginBottom: 6, opacity: 0.7, textTransform: 'uppercase', fontSize: 11 },
  bulletItem: { marginBottom: 6, lineHeight: 18 },
  errorText: { opacity: 0.6, fontStyle: 'italic', marginTop: 8 },
})

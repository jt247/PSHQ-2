import { useEffect, useState } from 'react'
import { ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, Stack } from 'expo-router'
import { trackLearningPathStarted, trackLearningModuleCompleted, trackLearningPathCompleted, trackContentMarkedComplete } from '@pshq/analytics'
import { ThemedView } from '@/components/themed-view'
import { ThemedText } from '@/components/themed-text'
import { supabase } from '@/lib/supabase'

interface ModuleRow { id: string; title: string; description: string | null; is_required: boolean; sequence: number }
interface PathDetail { id: string; title: string; description: string | null; outcomes: string[]; learning_path_modules: ModuleRow[] }

export default function LearningPathDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const [loading, setLoading] = useState(true)
  const [path, setPath] = useState<PathDetail | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [completed, setCompleted] = useState<Set<string>>(new Set())
  const [started, setStarted] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user?.id ?? null)

      const { data } = await supabase
        .from('learning_paths')
        .select('id, title, description, outcomes, learning_path_modules (id, title, description, is_required, sequence)')
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle()

      if (data) {
        const modules = [...((data.learning_path_modules ?? []) as ModuleRow[])].sort((a, b) => a.sequence - b.sequence)
        setPath({ ...(data as Omit<PathDetail, 'learning_path_modules'>), learning_path_modules: modules })

        if (user) {
          const [{ data: progress }, { data: userPath }] = await Promise.all([
            supabase.from('module_progress').select('module_id').eq('user_id', user.id).eq('status', 'completed'),
            supabase.from('user_learning_paths').select('id').eq('user_id', user.id).eq('learning_path_id', data.id).maybeSingle(),
          ])
          setCompleted(new Set((progress ?? []).map(p => p.module_id)))
          setStarted(!!userPath)
        }
      }
      setLoading(false)
    }
    load()
  }, [slug])

  async function handleStart() {
    if (!userId || !path) return
    await supabase.from('user_learning_paths').insert({ user_id: userId, learning_path_id: path.id })
    await trackLearningPathStarted({ supabase, source: 'mobile', userId }, { contentId: path.id })
    setStarted(true)
  }

  async function toggleModule(moduleId: string) {
    if (!userId || !path) return
    const isDone = completed.has(moduleId)
    await supabase.from('module_progress').upsert({
      user_id: userId, module_id: moduleId, status: isDone ? 'not_started' : 'completed',
      completed_at: isDone ? null : new Date().toISOString(), updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,module_id' })

    const next = new Set(completed)
    if (isDone) next.delete(moduleId); else next.add(moduleId)
    setCompleted(next)

    if (!isDone) {
      await trackLearningModuleCompleted({ supabase, source: 'mobile', userId }, { contentId: moduleId })
      await trackContentMarkedComplete({ supabase, source: 'mobile', userId }, { contentId: moduleId, metadata: { auto: false } })
      const required = path.learning_path_modules.filter(m => m.is_required)
      if (required.length > 0 && required.every(m => next.has(m.id))) {
        await supabase.from('user_learning_paths').update({ completed_at: new Date().toISOString() }).eq('user_id', userId).eq('learning_path_id', path.id)
        await trackLearningPathCompleted({ supabase, source: 'mobile', userId }, { contentId: path.id })
      }
    }
  }

  if (loading || !path) {
    return <ThemedView style={styles.center}><ActivityIndicator /></ThemedView>
  }

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ title: path.title, headerShown: true }} />
      <ScrollView contentContainerStyle={styles.container}>
        {path.description && <ThemedText type="default" style={styles.description}>{path.description}</ThemedText>}

        {userId && !started && (
          <Pressable onPress={handleStart} style={styles.startButton}>
            <ThemedText style={styles.startButtonText}>Start Path →</ThemedText>
          </Pressable>
        )}

        <ThemedText type="smallBold" style={styles.sectionTitle}>Modules</ThemedText>
        {path.learning_path_modules.map(m => {
          const isDone = completed.has(m.id)
          return (
            <Pressable key={m.id} onPress={() => started && toggleModule(m.id)} style={styles.moduleRow}>
              <ThemedView style={[styles.dot, isDone && styles.dotDone]}>
                <ThemedText style={[styles.dotText, isDone && styles.dotTextDone]}>{isDone ? '✓' : m.sequence}</ThemedText>
              </ThemedView>
              <ThemedView style={styles.moduleTextWrap}>
                <ThemedText type="default" style={styles.moduleTitle}>{m.title}</ThemedText>
                {m.description && <ThemedText type="small" style={styles.moduleDescription}>{m.description}</ThemedText>}
              </ThemedView>
            </Pressable>
          )
        })}
      </ScrollView>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 20, paddingBottom: 48 },
  description: { opacity: 0.75, marginBottom: 20 },
  startButton: { backgroundColor: '#111827', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginBottom: 24 },
  startButtonText: { color: '#fff', fontWeight: '600' },
  sectionTitle: { marginBottom: 12 },
  moduleRow: { flexDirection: 'row', gap: 12, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 14, marginBottom: 10, alignItems: 'flex-start' },
  dot: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  dotDone: { backgroundColor: '#15803d' },
  dotText: { fontSize: 12, fontWeight: '700', color: '#111827' },
  dotTextDone: { color: '#fff' },
  moduleTextWrap: { flex: 1 },
  moduleTitle: { fontWeight: '600', marginBottom: 2 },
  moduleDescription: { opacity: 0.7 },
})

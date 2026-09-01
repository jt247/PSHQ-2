import { useCallback, useState } from 'react'
import { ScrollView, View, Pressable, StyleSheet, ActivityIndicator, Image } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { trackLeaderboardViewed } from '@pshq/analytics'
import { ThemedView } from '@/components/themed-view'
import { ThemedText } from '@/components/themed-text'
import { supabase } from '@/lib/supabase'

const PERIODS = ['weekly', 'monthly', 'all_time'] as const
type Period = typeof PERIODS[number]
const PERIOD_LABELS: Record<Period, string> = { weekly: 'This Week', monthly: 'This Month', all_time: 'All Time' }

interface LeaderboardRow {
  rank: number
  user_id: string
  display_name: string
  avatar_url: string | null
  score: number
  is_self: boolean
}

// Epic F §F.1/mobile — replaces the Build Prompt 1 Community tab
// placeholder with the real leaderboard, same three views and the same
// get_leaderboard() RPC web uses (one source of truth for ranking/privacy
// masking, not reimplemented per-platform).
export default function CommunityScreen() {
  const [period, setPeriod] = useState<Period>('all_time')
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<LeaderboardRow[]>([])

  useFocusEffect(useCallback(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data } = await supabase.rpc('get_leaderboard', { p_period: period, p_limit: 50 })
      if (cancelled) return
      setRows((data ?? []) as LeaderboardRow[])
      setLoading(false)
      const { data: { user } } = await supabase.auth.getUser()
      await trackLeaderboardViewed({ supabase, source: 'mobile', userId: user?.id ?? null }, period)
    }
    load()
    return () => { cancelled = true }
  }, [period]))

  return (
    <ThemedView style={styles.flex}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>Leaderboard</ThemedText>
        <ThemedText type="small" style={styles.subtitle}>
          Ranked by real contribution, never by pageviews.
        </ThemedText>
        <View style={styles.tabRow}>
          {PERIODS.map(p => (
            <Pressable key={p} onPress={() => setPeriod(p)} style={[styles.tabChip, period === p && styles.tabChipActive]}>
              <ThemedText style={period === p ? styles.tabTextActive : styles.tabText}>{PERIOD_LABELS[p]}</ThemedText>
            </Pressable>
          ))}
        </View>
      </View>

      {loading ? (
        <ThemedView style={styles.center}><ActivityIndicator /></ThemedView>
      ) : rows.length === 0 ? (
        <ThemedView style={styles.center}>
          <ThemedText type="default" style={{ textAlign: 'center', paddingHorizontal: 24, opacity: 0.6 }}>
            Nobody&apos;s ranked yet {PERIOD_LABELS[period].toLowerCase()}. Complete an article or leave a thoughtful comment to start earning points.
          </ThemedText>
        </ThemedView>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {rows.map(row => (
            <View key={row.user_id} style={[styles.row, row.is_self && styles.rowSelf]}>
              <ThemedText type="smallBold" style={styles.rank}>#{row.rank}</ThemedText>
              {row.avatar_url ? (
                <Image source={{ uri: row.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <ThemedText type="smallBold">{row.display_name.charAt(0).toUpperCase()}</ThemedText>
                </View>
              )}
              <ThemedText type="default" style={styles.name} numberOfLines={1}>
                {row.display_name}{row.is_self ? ' (you)' : ''}
              </ThemedText>
              <ThemedText type="smallBold">{row.score} pts</ThemedText>
            </View>
          ))}
        </ScrollView>
      )}
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 22, marginBottom: 4 },
  subtitle: { opacity: 0.6, marginBottom: 12 },
  tabRow: { flexDirection: 'row', gap: 8 },
  tabChip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, borderColor: '#d1d5db' },
  tabChipActive: { backgroundColor: '#111827', borderColor: '#111827' },
  tabText: { fontSize: 13 },
  tabTextActive: { fontSize: 13, color: '#fff' },
  list: { padding: 20, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12 },
  rowSelf: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  rank: { width: 32 },
  avatar: { width: 28, height: 28, borderRadius: 14 },
  avatarFallback: { backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  name: { flex: 1, fontWeight: '600' },
})

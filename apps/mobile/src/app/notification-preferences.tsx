import { useEffect, useState } from 'react'
import { ScrollView, View, Switch, StyleSheet, ActivityIndicator, Pressable, Linking } from 'react-native'
import { Stack } from 'expo-router'
import { trackNotificationPreferenceUpdated } from '@pshq/analytics'
import { ThemedView } from '@/components/themed-view'
import { ThemedText } from '@/components/themed-text'
import { supabase } from '@/lib/supabase'
import { registerForPushNotifications, getPushPermissionStatus, type PushPermissionStatus } from '@/lib/push-notifications'

// Same types as web's NotificationPreferences.tsx — kept as one literal
// list per platform rather than a shared package export, since it's UI
// copy (label/description), not logic; the underlying `key` strings match
// exactly, which is what actually needs to stay in sync (both write to the
// same notification_preferences row). weekly_digest_prompt is new in
// Epic I — the digest itself ships in Build Prompt 11, but the toggle for
// it can exist and be respected now.
const NOTIFICATION_TYPES = [
  { key: 'recommended_content', label: 'New recommended content' },
  { key: 'learning_progress', label: 'Learning progress' },
  { key: 'new_achievement', label: 'New achievement' },
  { key: 'product_lab_reminder', label: 'Product Lab reminder' },
  { key: 'learning_path_update', label: 'Learning path update' },
  { key: 'product_announcement', label: 'Product announcement' },
  { key: 'feedback_response', label: 'Feedback response' },
  { key: 'community_milestone', label: 'Community milestone' },
  { key: 'weekly_digest_prompt', label: 'Weekly ProductSlice digest' },
] as const

export default function NotificationPreferencesScreen() {
  const [loading, setLoading] = useState(true)
  const [disabled, setDisabled] = useState<Set<string>>(new Set())
  const [pushStatus, setPushStatus] = useState<PushPermissionStatus | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('notification_preferences').select('key, enabled').eq('user_id', user.id)
      setDisabled(new Set((data ?? []).filter(p => !p.enabled).map(p => p.key)))
      setPushStatus(await getPushPermissionStatus())
      setLoading(false)
    }
    load()
  }, [])

  async function enablePush() {
    if (pushStatus === 'unavailable') return // banner already explains this — see below
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await registerForPushNotifications(supabase, user.id)
    setPushStatus(await getPushPermissionStatus())
  }

  async function toggle(key: string) {
    const wasEnabled = !disabled.has(key)
    setDisabled(prev => {
      const next = new Set(prev)
      if (wasEnabled) next.add(key)
      else next.delete(key)
      return next
    })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('notification_preferences').upsert(
      { user_id: user.id, key, enabled: !wasEnabled },
      { onConflict: 'user_id,key' }
    )
    if (!error) {
      await trackNotificationPreferenceUpdated({ supabase, source: 'mobile', userId: user.id }, key, !wasEnabled)
    } else {
      setDisabled(prev => {
        const next = new Set(prev)
        if (wasEnabled) next.delete(key)
        else next.add(key)
        return next
      })
    }
  }

  if (loading) return <ThemedView style={styles.center}><ActivityIndicator /></ThemedView>

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ title: 'Notification Preferences', headerShown: true }} />
      <ScrollView contentContainerStyle={styles.container}>
        {pushStatus !== 'granted' && (
          <Pressable
            style={styles.pushBanner}
            disabled={pushStatus === 'unavailable'}
            onPress={() => (pushStatus === 'denied' ? Linking.openSettings() : enablePush())}
          >
            <ThemedText type="smallBold">
              {pushStatus === 'unavailable' ? "Push isn't available in this preview build" : pushStatus === 'denied' ? 'Push notifications are off' : 'Turn on push notifications'}
            </ThemedText>
            <ThemedText type="small" style={styles.pushBannerHint}>
              {pushStatus === 'unavailable'
                ? "Android push needs a real installed build, not Expo Go — it'll work once you install the app properly. Your category choices below are still saved."
                : pushStatus === 'denied'
                ? 'Open Settings to allow notifications for these categories.'
                : 'Get notified for the categories you enable below.'}
            </ThemedText>
          </Pressable>
        )}
        {NOTIFICATION_TYPES.map(({ key, label }) => (
          <View key={key} style={styles.row}>
            <ThemedText type="default" style={styles.rowLabel}>{label}</ThemedText>
            <Switch value={!disabled.has(key)} onValueChange={() => toggle(key)} />
          </View>
        ))}
      </ScrollView>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 20 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  rowLabel: { flex: 1, paddingRight: 12 },
  pushBanner: { backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', borderRadius: 10, padding: 14, marginBottom: 16 },
  pushBannerHint: { opacity: 0.7, marginTop: 4 },
})

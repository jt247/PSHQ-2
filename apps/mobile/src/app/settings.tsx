import { View, Pressable, StyleSheet, Alert, ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router, Stack } from 'expo-router'
import { ThemedView } from '@/components/themed-view'
import { ThemedText } from '@/components/themed-text'
import { useAuth } from '@/lib/auth-context'
import { Brand } from '@/constants/brand'

// Design Brief §5 — Settings as a first-class destination instead of a
// single notification-preferences screen with nowhere else to grow.
// Account and Privacy both route to profile-edit — that's genuinely where
// those fields already live (privacy_tier is a field on the same form),
// not a placeholder route. Appearance is honest about what's actually
// controllable today rather than showing a dark-mode toggle that doesn't
// do anything (dark mode is intentionally disabled app-wide, see
// use-theme.ts) or a global font-size setting that doesn't exist (font
// size is a per-article reading control, see reader-controls.tsx).
export default function SettingsScreen() {
  const { signOut } = useAuth()

  function handleSignOut() {
    Alert.alert('Sign out?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ])
  }

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ title: 'Settings', headerShown: true }} />
      <ScrollView contentContainerStyle={styles.container}>
        <Group>
          <Row icon="person-outline" label="Account" onPress={() => router.push('/profile-edit')} />
          <Row icon="lock-closed-outline" label="Privacy" onPress={() => router.push('/profile-edit')} />
        </Group>

        <Group>
          <Row icon="notifications-outline" label="Notifications" onPress={() => router.push('/notification-preferences')} />
          <Row icon="text-outline" label="Appearance" note="Font size is available while reading" onPress={() => Alert.alert('Appearance', 'Text size can be adjusted from the A- / A+ control while reading any article. There is no dark mode yet — the app currently ships with one designed light theme.')} />
        </Group>

        <Group>
          <Row icon="help-circle-outline" label="Give Feedback" onPress={() => router.push('/feedback' as never)} />
        </Group>

        <Pressable style={styles.signOutRow} onPress={handleSignOut}>
          <ThemedText style={styles.signOutText}>Sign Out</ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  )
}

function Group({ children }: { children: React.ReactNode }) {
  return <View style={styles.group}>{children}</View>
}

function Row({ icon, label, note, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; note?: string; onPress: () => void }) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <Ionicons name={icon} size={20} color={Brand.navy} />
      <View style={styles.rowText}>
        <ThemedText type="default">{label}</ThemedText>
        {note && <ThemedText type="small" style={styles.note}>{note}</ThemedText>}
      </View>
      <Ionicons name="chevron-forward" size={18} color={Brand.mutedOnCream} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 20, gap: 20 },
  group: { borderWidth: 1, borderColor: Brand.hairline, borderRadius: 12, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Brand.hairline },
  rowText: { flex: 1 },
  note: { opacity: 0.5, marginTop: 2 },
  signOutRow: { paddingVertical: 14, alignItems: 'center' },
  signOutText: { color: '#dc2626', fontWeight: '600' },
})

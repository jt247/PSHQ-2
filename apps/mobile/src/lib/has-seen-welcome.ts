import AsyncStorage from '@react-native-async-storage/async-storage'

// The welcome/orientation screen (Design Brief §5) shows once, after first
// sign-in and before onboarding starts. There's no DB column for this — a
// per-device local flag is the honest, minimal way to track it: worst case
// a user sees it again on a new device, which is fine for a skippable
// orientation screen, not worth a migration.
function keyFor(userId: string): string {
  return `pshq:has-seen-welcome:${userId}`
}

export async function hasSeenWelcome(userId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(keyFor(userId))) === 'true'
  } catch {
    return true // fail open — never trap a user behind a broken storage read
  }
}

export async function markWelcomeSeen(userId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(keyFor(userId), 'true')
  } catch { /* non-fatal — worst case they see the welcome screen again */ }
}

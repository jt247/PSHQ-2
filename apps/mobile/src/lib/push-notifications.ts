import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { Platform } from 'react-native'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isExpoGoAndroid } from './is-expo-go'

// Epic I §I.6 — device-side half of push. Registration writes to the same
// push_tokens table the admin Communications Center and achievement-unlock
// route read (packages/api-client/src/push.ts); nothing push-specific is
// duplicated here beyond what's inherently on-device (permission prompt,
// token retrieval, foreground display config).
//
// Real crash reported live, root-caused by reading the actual installed
// package: expo-notifications' own DevicePushTokenAutoRegistration.fx.js
// calls addPushTokenListener() at MODULE TOP LEVEL (not inside any
// function), which calls warnOfExpoGoPushUsage(), which does
// `if (Platform.OS === 'android') throw new Error(...)` unconditionally
// when running in Expo Go. A static `import ... from 'expo-notifications'`
// evaluates that file immediately — guarding function CALLS (the first
// fix attempt) does nothing, because the crash happens at import time,
// before any of this file's own code runs. The only real fix: never
// statically import the module on this platform+client combination —
// dynamic `import()` only, gated by isExpoGoAndroid() BEFORE the import
// statement executes.
type NotificationsModule = typeof import('expo-notifications')
let cached: NotificationsModule | null = null
async function loadNotifications(): Promise<NotificationsModule | null> {
  if (isExpoGoAndroid()) return null
  if (!cached) cached = await import('expo-notifications')
  return cached
}

/**
 * Sets the foreground notification handler. Call once, early (e.g. from
 * the root layout) — safe to call multiple times, and a clean no-op on
 * Android inside Expo Go.
 */
export async function setupNotificationHandler(): Promise<void> {
  const Notifications = await loadNotifications()
  if (!Notifications) return
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  })
}

/**
 * Requests permission (if not already granted/denied) and upserts the
 * device's Expo push token for the signed-in user. Silently no-ops on a
 * simulator/emulator (no push credentials there), on Android inside Expo
 * Go (unsupported — see module comment above), or if the user declines —
 * push is additive, never a blocker for the rest of the app.
 */
export async function registerForPushNotifications(supabase: SupabaseClient, userId: string): Promise<void> {
  if (!Device.isDevice) return // simulators/emulators have no push token

  const Notifications = await loadNotifications()
  if (!Notifications) return

  try {
    const existing = await Notifications.getPermissionsAsync()
    let status = existing.status
    if (status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync()
      status = requested.status
    }
    if (status !== 'granted') return

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
      })
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined
    const tokenResponse = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)
    const token = tokenResponse.data

    await supabase.from('push_tokens').upsert(
      { user_id: userId, token, platform: Platform.OS === 'ios' ? 'ios' : 'android', updated_at: new Date().toISOString() },
      { onConflict: 'token' }
    )
  } catch {
    // Push registration is never allowed to break sign-in/app startup.
  }
}

export type PushPermissionStatus = 'granted' | 'denied' | 'undetermined' | 'unavailable'

/**
 * Current OS push-permission status, without prompting. 'unavailable'
 * means this platform+client combo can't do push at all (Android + Expo
 * Go) — never a real OS permission state, so callers should show a
 * "not available here" message instead of an "open Settings" one.
 */
export async function getPushPermissionStatus(): Promise<PushPermissionStatus> {
  const Notifications = await loadNotifications()
  if (!Notifications) return 'unavailable'
  return (await Notifications.getPermissionsAsync()).status
}

/**
 * Subscribes to notification-tap events. Returns an unsubscribe function
 * (always safe to call, even when the underlying subscription never
 * happened because this platform+client combo can't support it).
 */
export async function addNotificationOpenedListener(
  onOpened: (category: string) => void
): Promise<() => void> {
  const Notifications = await loadNotifications()
  if (!Notifications) return () => {}

  const sub = Notifications.addNotificationResponseReceivedListener(response => {
    const category = response.notification.request.content.data?.category
    if (typeof category === 'string') onOpened(category)
  })
  return () => sub.remove()
}

export type { NotificationsModule }

import * as Notifications from 'expo-notifications'
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
// Real crash reported live: on Android inside Expo Go, expo-notifications'
// remote-push functionality was removed in SDK 53 — even setting the
// notification handler here crashed the whole app on that specific
// platform+client combo. Guarded below; iOS Expo Go and any real Android
// dev build both still get the real handler.
if (!isExpoGoAndroid()) {
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
 * Go (unsupported — see isExpoGoAndroid), or if the user declines — push
 * is additive, never a blocker for the rest of the app.
 */
export async function registerForPushNotifications(supabase: SupabaseClient, userId: string): Promise<void> {
  if (!Device.isDevice) return // simulators/emulators have no push token
  if (isExpoGoAndroid()) return // would crash — see module comment above

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

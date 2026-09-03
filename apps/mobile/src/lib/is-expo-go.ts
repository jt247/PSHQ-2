import Constants, { ExecutionEnvironment } from 'expo-constants'
import { Platform } from 'react-native'

/**
 * Real crash reported live: expo-notifications removed Android remote
 * push support from Expo Go in SDK 53 — merely calling
 * getExpoPushTokenAsync() (and, in some SDK builds, even the module's own
 * top-level setup) on Android inside Expo Go throws and takes the whole
 * app down. Expo's own fix is "use a development build"; until a real
 * dev build exists, every push code path must check this first and skip
 * cleanly rather than crash. iOS Expo Go is unaffected — only Android is.
 */
export function isExpoGoAndroid(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient && Platform.OS === 'android'
}

import { DefaultTheme, Stack, ThemeProvider } from 'expo-router'
import { AuthProvider } from '@/lib/auth-context'

// This was reading the device's system dark-mode setting and switching
// React Navigation's own Stack screen background to black before any of
// this app's own components ever rendered — the actual root cause behind
// screens looking "purely black, no design at all" on a real device with
// system dark mode on. Dark mode was never a deliberately designed
// experience here (see use-theme.ts for the matching fix on the content
// side); this app has one designed look. Always light until that becomes
// a real, separately-designed feature.
export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider value={DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }} />
      </ThemeProvider>
    </AuthProvider>
  )
}

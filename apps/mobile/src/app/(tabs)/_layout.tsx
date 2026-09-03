import { Ionicons } from '@expo/vector-icons'
import { Redirect, Tabs } from 'expo-router'

import { useAuth } from '@/lib/auth-context'

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'home-outline',
  learn: 'school-outline',
  library: 'library-outline',
  community: 'people-outline',
  profile: 'person-outline',
}

// #3c87f7 is the app's one established accent (themed-text.tsx's
// linkPrimary) — used here instead of the system-dark-mode-driven text
// color this used to read, both for a real branded active-tab color and
// to stop pulling in system dark mode through a second, separate path.
const ACTIVE_TINT = '#3c87f7'

export default function TabsLayout() {
  const { session, loading, onboardingDone, profileLoading } = useAuth()

  // The tab navigator itself is the gate (Epic A.3): no session → sign in;
  // session but profile not finished → onboarding. Nothing behind here
  // needs its own per-screen check as a result.
  if (loading || (session && profileLoading)) return null
  if (!session) return <Redirect href="/sign-in" />
  if (!onboardingDone) return <Redirect href="/onboarding" />

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: ACTIVE_TINT,
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={ICONS[route.name]} size={size} color={color} />
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="learn" options={{ title: 'Learn' }} />
      <Tabs.Screen name="library" options={{ title: 'Library' }} />
      <Tabs.Screen name="community" options={{ title: 'Community' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  )
}

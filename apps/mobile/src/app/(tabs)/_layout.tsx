import { useEffect, useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { Redirect, Tabs } from 'expo-router'

import { useAuth } from '@/lib/auth-context'
import { AppSplash } from '@/components/app-splash'
import { hasSeenWelcome } from '@/lib/has-seen-welcome'

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
  const [welcomeSeen, setWelcomeSeen] = useState<boolean | null>(null)

  useEffect(() => {
    // Only relevant for users still headed into onboarding — an existing
    // member who finished onboarding long ago never gets interrupted by
    // this later, it's strictly a first-run beat (Design Brief §5).
    if (session?.user.id && !onboardingDone) {
      let cancelled = false
      hasSeenWelcome(session.user.id).then(seen => { if (!cancelled) setWelcomeSeen(seen) })
      return () => { cancelled = true }
    }
  }, [session?.user.id, onboardingDone])

  // The tab navigator itself is the gate (Epic A.3): no session → sign in;
  // session but profile not finished → onboarding, via a one-time welcome
  // screen first. Nothing behind here needs its own per-screen check.
  if (loading || (session && profileLoading)) return <AppSplash />
  if (!session) return <Redirect href="/sign-in" />
  if (!onboardingDone) {
    if (welcomeSeen === null) return <AppSplash />
    return <Redirect href={welcomeSeen ? '/onboarding' : '/welcome'} />
  }

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

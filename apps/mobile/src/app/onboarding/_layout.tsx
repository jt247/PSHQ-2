import { Redirect, Stack } from 'expo-router'
import { useAuth } from '@/lib/auth-context'

export default function OnboardingLayout() {
  const { session, loading, onboardingDone, profileLoading } = useAuth()

  if (loading || (session && profileLoading)) return null
  if (!session) return <Redirect href="/sign-in" />
  if (onboardingDone) return <Redirect href="/" />

  return <Stack screenOptions={{ headerShown: false }} />
}

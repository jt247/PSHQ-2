import { Redirect, Stack } from 'expo-router'
import { useAuth } from '@/lib/auth-context'

export default function AuthLayout() {
  const { session, loading, onboardingDone, profileLoading } = useAuth()

  if (loading || (session && profileLoading)) return null
  if (session) return <Redirect href={onboardingDone ? '/' : '/onboarding'} />

  return <Stack screenOptions={{ headerShown: false }} />
}

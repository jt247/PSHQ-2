import { useState } from 'react'
import { View, Image, Pressable, StyleSheet, useWindowDimensions } from 'react-native'
import { router } from 'expo-router'
import { ThemedText } from '@/components/themed-text'
import { useAuth } from '@/lib/auth-context'
import { markWelcomeSeen } from '@/lib/has-seen-welcome'
import { Brand } from '@/constants/brand'

// Design Brief §5 — a short, skippable orientation between login and
// onboarding: what the product is, what you get, how the five tabs work.
// Shown once per device per user (has-seen-welcome.ts), never blocks
// onboarding itself, which is a separate required flow.
const STEPS = [
  {
    image: require('../../assets/illustrations/welcome-orientation.jpg'),
    title: 'Welcome to ProductSlice HQ',
    body: 'Practical knowledge for people building technology products, drawn from real practice, not theory.',
  },
  {
    image: require('../../assets/illustrations/direction-building.jpg'),
    title: "Here's what you'll get",
    body: 'Learning paths, JT Build Notes, a real product case library, and Product Lab, all organized around six directions: Product, Growth, AI, Building, Careers, and Leadership.',
  },
  {
    image: require('../../assets/illustrations/direction-leadership.jpg'),
    title: 'Five tabs, one home base',
    body: 'Home is your dashboard. Learn, Library, and Community are where the content lives. Profile is you, your settings, and your progress.',
  },
]

export default function WelcomeScreen() {
  const { session } = useAuth()
  const { width } = useWindowDimensions()
  const [step, setStep] = useState(0)
  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  async function finish() {
    if (session?.user.id) await markWelcomeSeen(session.user.id)
    router.replace('/onboarding')
  }

  function next() {
    if (isLast) { finish(); return }
    setStep(s => s + 1)
  }

  return (
    <View style={styles.container}>
      <Pressable onPress={finish} style={styles.skip}>
        <ThemedText style={styles.skipText}>Skip</ThemedText>
      </Pressable>

      <Image source={current.image} style={[styles.image, { width, height: width * 0.75 }]} resizeMode="cover" />

      <View style={styles.textBlock}>
        <ThemedText type="title" style={styles.title}>{current.title}</ThemedText>
        <ThemedText type="default" style={styles.body}>{current.body}</ThemedText>
      </View>

      <View style={styles.dots}>
        {STEPS.map((_, i) => (
          <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
        ))}
      </View>

      <Pressable onPress={next} style={styles.nextButton}>
        <ThemedText style={styles.nextButtonText}>{isLast ? "Let's go →" : 'Next'}</ThemedText>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.cream },
  skip: { position: 'absolute', top: 56, right: 20, zIndex: 1, padding: 8 },
  skipText: { color: Brand.mutedOnCream, fontWeight: '600' },
  image: { backgroundColor: Brand.navy },
  textBlock: { paddingHorizontal: 28, paddingTop: 28, flex: 1 },
  title: { color: Brand.navy, fontSize: 22, marginBottom: 12 },
  body: { color: Brand.mutedOnCream, lineHeight: 22 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 16 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Brand.hairline },
  dotActive: { backgroundColor: Brand.gold, width: 20 },
  nextButton: { backgroundColor: Brand.gold, marginHorizontal: 28, marginBottom: 36, borderRadius: 10, paddingVertical: 15, alignItems: 'center' },
  nextButtonText: { color: Brand.navy, fontWeight: '700', fontSize: 15 },
})

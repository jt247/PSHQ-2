import { useState } from 'react'
import { Pressable, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { Link } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ThemedText } from '@/components/themed-text'
import { ThemedTextInput } from '@/components/themed-text-input'
import { useAuth } from '@/lib/auth-context'
import { useTheme } from '@/hooks/use-theme'

export default function SignInScreen() {
  const { signInWithPassword, signInWithGoogle } = useAuth()
  const theme = useTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSignIn() {
    if (!email || !password) { setError('Email and password are required.'); return }
    setPending(true)
    setError(null)
    const { error } = await signInWithPassword(email, password)
    setPending(false)
    if (error) setError(error)
    // On success, the (auth) group's layout redirects automatically once
    // the session updates — no manual navigation needed here.
  }

  async function handleGoogle() {
    setPending(true)
    setError(null)
    const { error } = await signInWithGoogle()
    setPending(false)
    if (error) setError(error)
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ThemedText type="title" style={styles.title}>Welcome back</ThemedText>

          <Pressable style={[styles.button, styles.googleButton]} onPress={handleGoogle} disabled={pending}>
            {/* Google's button stays a fixed light surface regardless of
                app theme (standard for Google sign-in buttons) — the text
                color must stay fixed dark to match, not ThemedText's
                default (which flips to white in dark mode and would be
                invisible on this always-light button). */}
            <ThemedText style={styles.googleButtonText}>Continue with Google</ThemedText>
          </Pressable>

          <ThemedTextInput
            style={styles.input}
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <ThemedTextInput
            style={styles.input}
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {error && <ThemedText style={styles.error}>{error}</ThemedText>}

          <Pressable style={styles.button} onPress={handleSignIn} disabled={pending}>
            {pending ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.buttonText}>Sign In</ThemedText>}
          </Pressable>

          <Link href="/sign-up" style={styles.link}>
            <ThemedText type="link">Don&apos;t have an account? Create one</ThemedText>
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, gap: 12, justifyContent: 'center', flexGrow: 1 },
  title: { marginBottom: 12, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 14, fontSize: 16 },
  // #3c87f7 is the app's one established accent (themed-text.tsx's
  // linkPrimary) — reused here instead of the old #111827, which is
  // nearly indistinguishable from a true-black dark-mode background.
  button: { backgroundColor: '#3c87f7', borderRadius: 8, padding: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' },
  googleButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db' },
  googleButtonText: { fontWeight: '600', color: '#111827' },
  error: { color: '#dc2626', textAlign: 'center' },
  link: { alignSelf: 'center', marginTop: 8 },
})

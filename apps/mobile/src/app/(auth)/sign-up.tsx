import { useState } from 'react'
import { TextInput, Pressable, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { Link } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ThemedText } from '@/components/themed-text'
import { useAuth } from '@/lib/auth-context'

export default function SignUpScreen() {
  const { signUpWithPassword } = useAuth()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [pending, setPending] = useState(false)

  async function handleSignUp() {
    if (!firstName || !lastName || !email || !password) { setError('All fields are required.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    setPending(true)
    setError(null)
    const { error } = await signUpWithPassword(email, password, firstName, lastName)
    setPending(false)
    if (error) setError(error)
    else setSuccess(true)
  }

  if (success) {
    return (
      <SafeAreaView style={styles.container}>
        <ThemedText type="title" style={styles.title}>Check your email</ThemedText>
        <ThemedText style={{ textAlign: 'center' }}>We sent a confirmation link to {email}. Verify it, then come back and sign in.</ThemedText>
        <Link href="/sign-in" style={styles.link}><ThemedText type="link">Back to sign in</ThemedText></Link>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ThemedText type="title" style={styles.title}>Create your space</ThemedText>

          <TextInput style={styles.input} placeholder="First name" value={firstName} onChangeText={setFirstName} />
          <TextInput style={styles.input} placeholder="Last name" value={lastName} onChangeText={setLastName} />
          <TextInput style={styles.input} placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
          <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />

          {error && <ThemedText style={styles.error}>{error}</ThemedText>}

          <Pressable style={styles.button} onPress={handleSignUp} disabled={pending}>
            {pending ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.buttonText}>Create account</ThemedText>}
          </Pressable>

          <Link href="/sign-in" style={styles.link}>
            <ThemedText type="link">Already have an account? Sign in</ThemedText>
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  content: { padding: 24, gap: 12, justifyContent: 'center', flexGrow: 1 },
  title: { marginBottom: 12, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 14, fontSize: 16 },
  button: { backgroundColor: '#111827', borderRadius: 8, padding: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' },
  error: { color: '#dc2626', textAlign: 'center' },
  link: { alignSelf: 'center', marginTop: 8 },
})

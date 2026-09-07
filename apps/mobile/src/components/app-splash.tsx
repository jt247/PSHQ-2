import { View, Image, StyleSheet } from 'react-native'
import { ThemedText } from '@/components/themed-text'
import { Brand } from '@/constants/brand'

// Design Brief §5 — a real first-impression beat instead of a blank white
// screen while the session bootstraps. Shown by (tabs)/_layout.tsx in
// place of `return null` during the loading window, and nowhere else —
// this is not a native launch-screen replacement, just the in-app moment
// while auth/profile state resolves.
export function AppSplash() {
  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/illustrations/splash-hero.jpg')}
        style={styles.image}
        resizeMode="cover"
      />
      <View style={styles.textBlock}>
        <ThemedText type="title" style={styles.title}>ProductSlice HQ</ThemedText>
        <ThemedText type="default" style={styles.tagline}>
          Practical knowledge for people building technology products.
        </ThemedText>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.navy, justifyContent: 'center' },
  image: { width: '100%', height: '55%' },
  textBlock: { paddingHorizontal: 32, paddingTop: 24 },
  title: { color: Brand.gold, fontSize: 26, marginBottom: 10, textAlign: 'center' },
  tagline: { color: Brand.mutedOnNavy, textAlign: 'center', lineHeight: 22 },
})

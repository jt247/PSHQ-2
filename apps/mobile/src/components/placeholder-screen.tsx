import { StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ThemedText } from '@/components/themed-text'

interface Props {
  title: string
  description: string
}

// Shared shell for the five tab stubs (Epic I: real screens land epic-by-epic
// alongside web from here — see the mobile brief in Epic A). Each tab file
// is a one-line wrapper around this so adding real content later means
// replacing the wrapper's body, not restructuring navigation.
export function PlaceholderScreen({ title, description }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <ThemedText type="title">{title}</ThemedText>
        <ThemedText type="default" style={styles.description}>
          {description}
        </ThemedText>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  description: { textAlign: 'center', opacity: 0.6 },
})

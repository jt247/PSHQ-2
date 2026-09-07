import { View, StyleSheet } from 'react-native'
import { Brand } from '@/constants/brand'

// Design Brief §5 — dashboard rows should look like data (a real bar),
// not a paragraph of "3 done, 2 remaining" text.
export function ProgressBar({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent))
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${clamped}%` }]} />
    </View>
  )
}

const styles = StyleSheet.create({
  track: { height: 6, borderRadius: 3, backgroundColor: Brand.hairline, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: Brand.gold, borderRadius: 3 },
})

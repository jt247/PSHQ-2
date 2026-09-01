import { View, Pressable, StyleSheet } from 'react-native'
import { ThemedText } from '@/components/themed-text'

interface SingleProps {
  options: readonly string[]
  value: string | null
  onChange: (value: string) => void
  labels?: Record<string, string>
}

export function ChipSingleSelect({ options, value, onChange, labels }: SingleProps) {
  return (
    <View style={styles.grid}>
      {options.map(opt => (
        <Pressable key={opt} onPress={() => onChange(opt)} style={[styles.chip, value === opt && styles.chipSelected]}>
          <ThemedText style={value === opt ? styles.chipTextSelected : styles.chipText}>{labels?.[opt] ?? opt}</ThemedText>
        </Pressable>
      ))}
    </View>
  )
}

interface MultiProps {
  options: readonly string[]
  value: string[]
  onChange: (value: string[]) => void
  max?: number
  exclude?: string | null
}

export function ChipMultiSelect({ options, value, onChange, max, exclude }: MultiProps) {
  const visible = options.filter(o => o !== exclude)
  const limitReached = max != null && value.length >= max

  function toggle(opt: string) {
    if (value.includes(opt)) onChange(value.filter(o => o !== opt))
    else if (!limitReached) onChange([...value, opt])
  }

  return (
    <View style={styles.grid}>
      {visible.map(opt => {
        const selected = value.includes(opt)
        return (
          <Pressable key={opt} onPress={() => toggle(opt)} disabled={!selected && limitReached} style={[styles.chip, selected && styles.chipSelected, !selected && limitReached && styles.chipDisabled]}>
            <ThemedText style={selected ? styles.chipTextSelected : styles.chipText}>{opt}</ThemedText>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: '#d1d5db' },
  chipSelected: { backgroundColor: '#111827', borderColor: '#111827' },
  chipDisabled: { opacity: 0.4 },
  chipText: { fontSize: 13 },
  chipTextSelected: { fontSize: 13, color: '#fff' },
})

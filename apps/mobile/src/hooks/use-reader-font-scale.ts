import { useCallback, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Epic I §I.4 — one reader-wide font size setting (not per-article), shared
// by every in-app reading screen (articles, build notes, the new ebook
// screen) so it only needs building once.
const STORAGE_KEY = 'reader.fontScale'
const SCALES = [0.9, 1, 1.15, 1.3] as const
const DEFAULT_INDEX = 1

export function useReaderFontScale() {
  const [index, setIndex] = useState(DEFAULT_INDEX)

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(v => {
      const parsed = v ? parseInt(v, 10) : DEFAULT_INDEX
      if (!isNaN(parsed) && parsed >= 0 && parsed < SCALES.length) setIndex(parsed)
    })
  }, [])

  const setScaleIndex = useCallback((next: number) => {
    const clamped = Math.max(0, Math.min(SCALES.length - 1, next))
    setIndex(clamped)
    AsyncStorage.setItem(STORAGE_KEY, String(clamped)).catch(() => {})
  }, [])

  return { scale: SCALES[index], index, maxIndex: SCALES.length - 1, setScaleIndex }
}

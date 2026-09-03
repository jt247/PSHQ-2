/**
 * Reported live and confirmed: the app was silently following the
 * device's system dark-mode setting via useColorScheme(), even though
 * dark mode was never a deliberately designed, tested experience —
 * several screens read as "purely black, no design" once a real device
 * had system dark mode on. This wasn't a per-screen bug list, it was the
 * wrong default at the root: this app has one designed look (light,
 * matching web), not two.
 *
 * Fixed at the root: always resolve to the light theme, regardless of
 * the device's system setting. app.json's userInterfaceStyle is also set
 * to "light" (the native-level version of the same decision), but that
 * alone depends on a native manifest read that can lag in Expo Go —
 * this JS-level fix is the one that's immediately reliable everywhere.
 *
 * If real dark mode support becomes a deliberate, designed feature later,
 * swap the hardcoded 'light' below for useColorScheme() again — every
 * screen already reads colors through this one hook, so that's a one-line
 * change, not a re-audit.
 */
import { Colors } from '@/constants/theme';

export function useTheme() {
  return Colors.light;
}

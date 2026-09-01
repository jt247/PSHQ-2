import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}

// Sized down one step across the board (2026-09-01, JT feedback: headings
// and especially body text read too large). `title` in particular was the
// Expo starter template's splash-screen scale (48px) but got reused as
// every screen's plain page header (Library, Settings, ...) — 48px reads
// oversized for that job on a phone-width screen, so it drops the most.
const styles = StyleSheet.create({
  small: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: 500,
  },
  smallBold: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: 700,
  },
  default: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: 500,
  },
  title: {
    fontSize: 28,
    fontWeight: 600,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 21,
    lineHeight: 27,
    fontWeight: 600,
  },
  link: {
    lineHeight: 26,
    fontSize: 13,
  },
  linkPrimary: {
    lineHeight: 26,
    fontSize: 13,
    color: '#3c87f7',
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});

import { TextInput, type TextInputProps } from 'react-native'
import { useTheme } from '@/hooks/use-theme'

// Bug reported live on a dark-mode device: typed text was invisible on
// every form in the app (onboarding, sign-in/up, profile edit, feedback,
// comments, learning path creation). Root cause — a plain <TextInput>
// never themes itself the way ThemedView/ThemedText do; with no explicit
// color/backgroundColor it renders default black-on-transparent, which
// sits directly on a ThemedView's black background in dark mode. This is
// the one shared fix instead of patching each of the 7 affected files
// with its own inline useTheme() lookup.
export function ThemedTextInput({ style, ...props }: TextInputProps) {
  const theme = useTheme()
  return (
    <TextInput
      placeholderTextColor={theme.textSecondary}
      style={[{ color: theme.text, backgroundColor: theme.backgroundElement }, style]}
      {...props}
    />
  )
}

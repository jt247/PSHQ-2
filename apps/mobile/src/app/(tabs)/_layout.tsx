import { Ionicons } from '@expo/vector-icons'
import { Tabs } from 'expo-router'

import { Colors } from '@/constants/theme'
import { useColorScheme } from '@/hooks/use-color-scheme'

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'home-outline',
  learn: 'school-outline',
  library: 'library-outline',
  community: 'people-outline',
  profile: 'person-outline',
}

export default function TabsLayout() {
  const scheme = useColorScheme()
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light']

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={ICONS[route.name]} size={size} color={color} />
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="learn" options={{ title: 'Learn' }} />
      <Tabs.Screen name="library" options={{ title: 'Library' }} />
      <Tabs.Screen name="community" options={{ title: 'Community' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  )
}

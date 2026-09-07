import { ThemedView } from '@/components/themed-view'
import { MemberDashboard } from '@/components/member-dashboard'

// Live feedback (2026-09-07) — Dashboard is now its own tab (replacing
// Community's old slot). Home stays the public landing page for every
// visitor, signed in or not; this is where "Go to Dashboard" leads.
export default function DashboardScreen() {
  return (
    <ThemedView style={{ flex: 1 }}>
      <MemberDashboard />
    </ThemedView>
  )
}

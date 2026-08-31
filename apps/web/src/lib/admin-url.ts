// Admin now lives in its own app (apps/admin, separate deployment). Used
// wherever this app needs to send an admin user there — post-login/
// onboarding redirects, the "Admin Panel" link in the dashboard sidebar.
export function adminUrl(): string {
  const url = process.env.NEXT_PUBLIC_ADMIN_URL
  if (!url) throw new Error('NEXT_PUBLIC_ADMIN_URL is not configured')
  return url
}

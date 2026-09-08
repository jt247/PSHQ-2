// Admin now lives in its own app (apps/admin, separate deployment). Used
// wherever this app needs to send an admin user there — post-login/
// onboarding redirects, the "Admin Panel" link in the dashboard sidebar.
//
// Real bug found live: this used to throw when the env var was missing,
// which crashed the ENTIRE sign-in flow and every dashboard page load
// for every admin/super_admin account — confirmed NEXT_PUBLIC_ADMIN_URL
// is not set in Vercel production at all (apps/admin has no production
// deployment yet). A missing admin URL is a real, separate gap (someone
// needs to actually deploy apps/admin and set this), but it must never
// crash a real login — every caller now treats null as "admin link/
// redirect unavailable right now" and falls back to the normal member
// dashboard instead of throwing.
export function adminUrl(): string | null {
  return process.env.NEXT_PUBLIC_ADMIN_URL || null
}

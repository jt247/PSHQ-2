import { LegalPage } from '@/components/layout/LegalPage'

export default function DataDeletionPage() {
  return (
    <LegalPage
      title="Data Deletion Policy"
      lastUpdated="June 20, 2026"
      intro="This policy explains how you can request deletion of your account and data from Product Slice HQ, and what happens when you do."
      sections={[
        {
          heading: '1. How to Request Deletion',
          body: `You can request account deletion in either of these ways:
• Email us at hello@productslicehq.com with the subject line "Account Deletion Request" from your registered email address
• Submit a support ticket from your dashboard requesting account deletion

We aim to process deletion requests within 14 days of receiving them.`,
        },
        {
          heading: '2. What Gets Deleted',
          body: `When your account is deleted, we remove:
• Your profile information (name, email, job role, country, areas of interest)
• Your comments, ratings, and reviews (these may be anonymised rather than fully removed if removing them entirely would break the display of other users' replies — see Section 4)
• Your support ticket history
• Your content requests
• Your saved/unlocked content library associations`,
        },
        {
          heading: '3. What We Retain, and Why',
          body: `Some information cannot be immediately deleted due to legal, tax, or fraud-prevention obligations:

• Records of payment link clicks: Product Slice HQ does not process payment directly — paid resources are purchased via third-party platforms (Selar) or direct payment links (Paystack/Flutterwave). We may retain a basic record that you clicked a payment link for a given resource, for support purposes, even after account deletion. Your actual payment/transaction history lives with the third-party platform that processed it, not with us, and is subject to their own data retention policies.

• Aggregated/anonymised analytics: usage data that has already been aggregated and anonymised (and therefore no longer identifies you personally) is not deleted, as it no longer constitutes personal data.

• Admin action logs: if you held an admin role, a limited record of administrative actions you took may be retained for security and audit purposes, with personal identifiers minimised.`,
        },
        {
          heading: '4. Comments and Public Contributions',
          body: "If you've left comments on public articles, deleting your account will either remove the comment entirely or display it as \"Deleted User\" depending on whether removing it would disrupt the surrounding conversation (e.g. replies from other users). We'll always remove your personal identifying information regardless of which approach applies.",
        },
        {
          heading: '5. Third-Party Services',
          body: "Deleting your account triggers deletion or anonymisation of your data within our own systems. Some data may persist briefly in third-party service backups (e.g. Supabase, PostHog, Resend) until their own backup retention cycles complete — typically no longer than 90 days. We do not have the ability to instantly purge third-party backup systems, but your data will no longer be active or accessible.",
        },
        {
          heading: "6. What Happens to Free Content You've Unlocked",
          body: "Once your account is deleted, you lose access to any content unlocks or library associations tied to your account. Since all content directly hosted on Product Slice HQ is free, we recommend downloading anything you wish to keep before requesting deletion. Paid resources purchased via Selar, Paystack, or Flutterwave are managed through those platforms' own access systems and are not affected by deleting your Product Slice HQ account.",
        },
        {
          heading: '7. Contact Us',
          body: "Questions about this policy or how to request deletion? Reach us at hello@productslicehq.com or via our Contact page.",
        },
      ]}
    />
  )
}

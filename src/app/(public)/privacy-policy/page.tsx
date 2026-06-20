import { LegalPage } from '@/components/layout/LegalPage'

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      lastUpdated="June 20, 2026"
      intro='Product Slice HQ ("we," "us," "our," "the Platform") is operated by Joshua Theophilus. This Privacy Policy explains what information we collect, how we use it, and the choices you have. By using Product Slice HQ, you agree to the practices described here.'
      sections={[
        {
          heading: '1. Information We Collect',
          body: `1.1 Information you give us

• Account information: first name, last name, email address, password (if you sign up with email), or basic profile information provided by Google if you sign up with Google.
• Profile information: job role, country, and areas of interest you select after signing up.
• Content you submit: comments, ratings, reviews, content requests, and support ticket messages (including any image attachments you upload).
• Payment-related information: we collect none. All content directly hosted on Product Slice HQ is free. Paid resources and initiatives are listed on the Platform for discovery only — when you choose one, you are redirected to Selar, where the resource is hosted, sold, and paid for in full. Product Slice HQ never handles, sees, or stores any payment information. No card details, no transaction records, no payment processor data of any kind passes through us.

1.2 Information collected automatically

• Usage data: pages visited, content viewed/clicked/downloaded, session duration, device type, and general engagement patterns, collected via PostHog.
• Anonymous activity: if you read public articles without an account, we record anonymous view and click counts (not tied to your identity) to understand which content is useful.`,
        },
        {
          heading: '2. How We Use Your Information',
          body: `We use your information to:

• Create and manage your account
• Give you access to content you've unlocked
• Personalise recommendations and "trending" content shown to you
• Respond to support requests and content requests
• Send you notifications you've opted into (in-app and/or email)
• Understand how the Platform is used so we can improve it
• Generate AI summaries of articles you request (see Section 6)`,
        },
        {
          heading: '3. Who We Share Information With',
          body: `We share information only with the service providers that help us run the Platform, and only as needed for them to provide their service:

• Supabase — Database, authentication: account and profile data
• Selar — Hosting, selling, and processing payment for paid resources and initiatives: when you click through to a Selar listing, you leave Product Slice HQ entirely; we send nothing to Selar and receive nothing back — it is a one-way redirect
• Resend — Transactional and broadcast email: your email address, name, and message content for emails we send you
• PostHog — Product analytics: usage and behavioural data
• Google Analytics — Website/traffic analytics: usage and behavioural data, device and location information
• Meta Pixel / Conversions API — Understanding how people find and engage with the Platform: usage data and, where applicable, hashed contact information to match activity to ad performance
• Cloudflare (R2) — File and image storage: files you upload and content files
• Google — Sign in with Google (if used): basic profile information from your Google account
• Google Gemini API — AI article summaries: the text of the article you request a summary for (not your personal information)
• Sentry — Error monitoring: technical error logs, which may occasionally include limited account context to help us debug issues

We do not sell your personal information to third parties. We do use Meta Pixel and Google Analytics to understand how people discover and use the Platform — see our Cookie Policy for how to manage this.

We may also disclose information if required by law, or to protect the rights, safety, or property of Product Slice HQ, our users, or the public.`,
        },
        {
          heading: '4. Cookies',
          body: 'We use cookies and similar technologies for authentication (keeping you signed in) and analytics (via PostHog). See our Cookie Policy for details and how to manage your preferences.',
        },
        {
          heading: '5. Data Retention',
          body: 'We retain your account information for as long as your account is active. If you request account deletion, see our Data Deletion Policy for what happens to your data, including any limited records we retain for legal, tax, or fraud-prevention purposes.',
        },
        {
          heading: '6. AI Article Summaries',
          body: "If you use the AI Summary feature on an article, the article's text is sent to Google's Gemini API to generate a summary. We cache the generated summary so the same article doesn't need to be re-processed for every user. We do not send your personal information to Gemini as part of this feature — only the article content itself.",
        },
        {
          heading: '7. Your Rights and Choices',
          body: `Product Slice HQ is based in Nigeria, and we apply data protection practices consistent with Nigeria's Data Protection Act 2023 and the Nigeria Data Protection Regulation (NDPR). If you're located in the European Union or UK, you may also have rights under the General Data Protection Regulation (GDPR). In practice we extend the same set of rights to all users:

• Access the personal information we hold about you
• Correct inaccurate information (via your account Settings)
• Request deletion of your account and associated data
• Opt out of marketing/broadcast notifications
• Object to or restrict certain processing of your data
• Request a copy of your data in a portable format

To exercise these rights, contact us at hello@productslicehq.com.`,
        },
        {
          heading: "8. Children's Privacy",
          body: 'Product Slice HQ is intended for working professionals and is not directed at children under 16. We do not knowingly collect personal information from children.',
        },
        {
          heading: '9. International Users',
          body: "Product Slice HQ is based in Nigeria and our community is primarily based across Africa. That said, the Platform is accessible to anyone, anywhere, and we welcome users from any country, including the EU and UK. If you're located outside Nigeria, your information will be processed in Nigeria and/or by the third-party service providers listed in Section 3. For users in the European Union or UK, we aim to handle your data consistently with GDPR principles. By using the Platform, you consent to this processing and transfer.",
        },
        {
          heading: '10. Changes to This Policy',
          body: 'We may update this Privacy Policy from time to time. We\'ll update the "Last updated" date above, and for material changes, we may notify you via email or an in-app notification.',
        },
        {
          heading: '11. Contact Us',
          body: 'Questions about this Privacy Policy? Reach us at hello@productslicehq.com or via our Contact page.',
        },
      ]}
    />
  )
}

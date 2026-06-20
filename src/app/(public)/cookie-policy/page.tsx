import { LegalPage } from '@/components/layout/LegalPage'

export default function CookiePolicyPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      lastUpdated="June 20, 2026"
      intro="This Cookie Policy explains how Product Slice HQ uses cookies and similar technologies when you visit our Platform."
      sections={[
        {
          heading: '1. What Are Cookies?',
          body: "Cookies are small text files stored on your device when you visit a website. They help the site remember information about your visit, like your login state or preferences.",
        },
        {
          heading: '2. Cookies We Use',
          body: `• Essential / Authentication — Keep you signed in, remember your session, secure your account (e.g. Supabase Auth session cookies)

• Analytics — Understand how visitors use the Platform so we can improve it (e.g. PostHog and Google Analytics — page views, clicks, session data)

• Marketing / Advertising — Understand how people discover the Platform via social media and measure the performance of our content and any promotions (e.g. Meta Pixel and Meta Conversions API, which may include hashed contact information to match activity to ad/content performance)

• Functional — Remember preferences like content filters you've selected (local storage / preference cookies)

We do not use third-party advertising cookies from ad networks outside of Meta, and we do not sell data collected through cookies to advertisers.`,
        },
        {
          heading: '3. Essential Cookies',
          body: "Some cookies are strictly necessary for the Platform to function — for example, staying signed in to your account. These cannot be disabled without affecting core functionality like accessing your dashboard or purchased content.",
        },
        {
          heading: '4. Analytics Cookies',
          body: "We use PostHog and Google Analytics to understand how people use Product Slice HQ — which articles are popular, where people drop off in signup, and how content performs. This helps us build a better platform. You can opt out of analytics cookies using the cookie preference banner shown on your first visit, or by adjusting your browser settings to block tracking cookies (note: this may affect some Platform functionality).",
        },
        {
          heading: '5. Marketing Cookies',
          body: "We use Meta Pixel and Meta Conversions API to understand how people discover Product Slice HQ through social media and to measure how our content performs. You can opt out of marketing cookies using the cookie preference banner, or through your Meta ad preferences settings.",
        },
        {
          heading: '6. Managing Cookies',
          body: `You can control or delete cookies through your browser settings at any time. Most browsers let you:
• View what cookies are stored
• Delete existing cookies
• Block cookies from specific or all sites

Note that blocking essential cookies will likely prevent you from signing in or using your dashboard.`,
        },
        {
          heading: '7. Changes to This Policy',
          body: "We may update this Cookie Policy as our use of cookies evolves. Check back periodically for updates.",
        },
        {
          heading: '8. Contact Us',
          body: "Questions about our use of cookies? Reach us at hello@productslicehq.com or via our Contact page.",
        },
      ]}
    />
  )
}

import { LegalPage } from '@/components/layout/LegalPage'

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms & Conditions"
      lastUpdated="June 20, 2026"
      intro='Welcome to Product Slice HQ. These Terms & Conditions ("Terms") govern your use of the Product Slice HQ platform (the "Platform"), operated by Joshua Theophilus. By creating an account or using the Platform, you agree to these Terms.'
      sections={[
        {
          heading: '1. Who Can Use Product Slice HQ',
          body: "You must be at least 16 years old to create an account. By signing up, you confirm that the information you provide is accurate and that you'll keep it up to date.",
        },
        {
          heading: '2. Your Account',
          body: `• You're responsible for keeping your password secure and for all activity under your account.
• You may sign up using email/password or via Google sign-in.
• We reserve the right to suspend or terminate accounts that violate these Terms, attempt to abuse the Platform, or engage in fraudulent activity.`,
        },
        {
          heading: '3. Content on the Platform',
          body: `3.1 Our content
All articles, e-books, templates, courses, and other materials on Product Slice HQ ("Content") are created and owned by Joshua Theophilus / Product Slice HQ unless otherwise stated. Content is provided for your personal and professional use.

3.2 What you can do with Content
• Free content: you may read, download, and use free Content for your own personal or internal business purposes.
• Paid content: once purchased, you may download and use the Content for your own personal or internal business purposes (e.g. applying a template to your own product work).
• What you may not do: resell, redistribute, publicly republish, or claim authorship of any Content (free or paid), or share your account access/downloaded files for others to access content they haven't unlocked or purchased themselves.

3.3 Comments, ratings, and reviews
If you post a comment, rating, or review, you confirm it's your own genuine opinion, you won't post anything unlawful, abusive, or misleading, and you grant us permission to display it on the Platform. We may moderate or remove content that violates these Terms at our discretion.`,
        },
        {
          heading: '4. Paid Resources and Payment Links',
          body: `All content directly hosted on Product Slice HQ — articles, free e-books, free templates, and free courses — is free to access once you're signed in.

Some resources are paid and are listed on Product Slice HQ for discovery purposes only. When you choose to access a paid resource, you'll be directed via a payment link to a third-party platform (such as Selar) or a direct payment link (such as Paystack or Flutterwave) tied to the founder's personal or business account, where you'll complete payment and receive access or delivery instructions.

By using a payment link from Product Slice HQ, you understand that:
• The transaction itself is governed by the terms of the third-party platform processing your payment
• Product Slice HQ is not the merchant of record for these transactions in most cases — we list and promote the resource, but payment, delivery, and related customer service may be handled directly by the founder outside the Platform
• See our Refund Policy for how refund requests for paid resources are handled`,
        },
        {
          heading: '5. Live Initiatives (e.g. Product Lab with JT)',
          body: "Live workshops and cohort-based initiatives (such as Product Lab with JT) are listed under our Initiatives page and may have their own separate registration and payment process, paid via a direct payment link to the founder's personal or business account. Specific terms for a given initiative (dates, format, what's included) will be described on that initiative's page at the time of registration.",
        },
        {
          heading: '6. AI Summary Feature',
          body: "Articles on the Platform may offer an AI-generated summary (powered by Google's Gemini API). AI-generated summaries are provided for convenience and may not perfectly capture every detail or nuance of the original article. The original article text remains the authoritative source.",
        },
        {
          heading: '7. Acceptable Use',
          body: `You agree not to:
• Use the Platform for any unlawful purpose
• Attempt to access another user's account or data
• Attempt to scrape, copy, or systematically extract Content from the Platform
• Upload or transmit any malicious code, spam, or harmful content
• Impersonate any person or entity, or misrepresent your affiliation with anyone`,
        },
        {
          heading: '8. Intellectual Property',
          body: 'The Product Slice HQ name, logo, and all Content are the intellectual property of Joshua Theophilus unless otherwise noted. Nothing in these Terms transfers ownership of any intellectual property to you beyond the limited usage rights described in Section 3.2.',
        },
        {
          heading: '9. Third-Party Services',
          body: 'The Platform relies on third-party services (including Supabase, Resend, PostHog, Google Analytics, Meta Pixel, Cloudflare, Google, and Sentry) to operate, and on third-party platforms (such as Selar, Paystack, or Flutterwave) for processing payment. We are not responsible for outages, errors, or issues caused by these third-party services, though we\'ll make reasonable efforts to resolve disruptions.',
        },
        {
          heading: '10. Disclaimers',
          body: 'The Platform and its Content are provided "as is." While we aim to provide accurate, useful, and practical product management guidance, we make no guarantees about outcomes from applying any framework, template, or advice found on the Platform. You are responsible for how you use the Content in your own work.',
        },
        {
          heading: '11. Limitation of Liability',
          body: 'To the fullest extent permitted by law, Product Slice HQ and Joshua Theophilus will not be liable for any indirect, incidental, or consequential damages arising from your use of the Platform, including but not limited to loss of data, revenue, or business opportunities.',
        },
        {
          heading: '12. Termination',
          body: 'You may stop using the Platform and request account deletion at any time (see our Data Deletion Policy). We may suspend or terminate your access if you violate these Terms.',
        },
        {
          heading: '13. Changes to These Terms',
          body: 'We may update these Terms from time to time. Continued use of the Platform after changes take effect constitutes acceptance of the updated Terms.',
        },
        {
          heading: '14. Governing Law',
          body: 'These Terms are governed by the laws of the Federal Republic of Nigeria, without regard to conflict-of-law principles. Product Slice HQ is domiciled in Nigeria and primarily serves a community across Africa, but the Platform is accessible to and welcomes users from anywhere in the world.',
        },
        {
          heading: '15. Contact Us',
          body: 'Questions about these Terms? Reach us at hello@productslicehq.com or via our Contact page.',
        },
      ]}
    />
  )
}

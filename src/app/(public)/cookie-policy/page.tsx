import { LegalPage } from '@/components/layout/LegalPage'

export default function CookiePolicyPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      lastUpdated="June 2025"
      intro="This policy explains how Product Slice HQ uses cookies and similar technologies when you visit our platform."
      sections={[
        {
          heading: 'What Are Cookies',
          body: 'Cookies are small text files stored on your device when you visit a website. They allow us to recognise your browser, remember your preferences, and provide a more consistent experience across visits.',
        },
        {
          heading: 'Essential Cookies',
          body: 'We use strictly necessary cookies to enable core platform functions — including authentication, session management, and security. These cookies cannot be disabled without breaking the platform.',
        },
        {
          heading: 'Analytics Cookies',
          body: 'We use analytics tools to understand how users navigate the platform. This helps us improve content discovery, page performance, and user experience. Analytics data is aggregated and does not identify individuals.',
        },
        {
          heading: 'Managing Cookies',
          body: 'You can control cookies through your browser settings. Disabling certain cookies may affect the functionality of the platform. Most browsers allow you to view, delete, and block cookies through their privacy or settings menus.',
        },
        {
          heading: 'Third-Party Cookies',
          body: 'Some features on our platform — such as payment processing via Paystack — may set third-party cookies. These are governed by the respective third parties\' privacy and cookie policies.',
        },
      ]}
    />
  )
}

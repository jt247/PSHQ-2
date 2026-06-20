import { LegalPage } from '@/components/layout/LegalPage'

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      lastUpdated="June 2025"
      intro="This policy explains how Product Slice HQ collects, uses, and protects information about you when you use our platform."
      sections={[
        {
          heading: 'Information We Collect',
          body: 'We collect information you provide directly — such as your name, email address, job role, and areas of interest when you create an account. We also collect usage data such as which content you view and interact with in order to personalise your experience.',
        },
        {
          heading: 'How We Use Your Information',
          body: 'We use your information to operate and improve the platform, send you relevant content and product updates, and provide customer support. We do not sell your personal data to third parties.',
        },
        {
          heading: 'Data Storage and Security',
          body: 'Your data is stored securely using industry-standard practices. We use Supabase for data storage, which provides encryption at rest and in transit. We implement appropriate technical and organisational measures to protect against unauthorised access.',
        },
        {
          heading: 'Cookies',
          body: 'We use cookies to maintain your session and improve your experience. See our Cookie Policy for more details on the specific cookies we use and how to manage them.',
        },
        {
          heading: 'Your Rights',
          body: 'You have the right to access, correct, or delete your personal data at any time. You may also withdraw consent for marketing communications. To exercise any of these rights, please contact us via the contact page.',
        },
        {
          heading: 'Changes to This Policy',
          body: 'We may update this policy from time to time. When we make material changes, we will notify you by email or with a notice on the platform. Continued use of the platform after changes constitutes acceptance of the updated policy.',
        },
      ]}
    />
  )
}

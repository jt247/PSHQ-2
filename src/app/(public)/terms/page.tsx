import { LegalPage } from '@/components/layout/LegalPage'

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      lastUpdated="June 2025"
      intro="By accessing or using Product Slice HQ, you agree to be bound by these terms. Please read them carefully."
      sections={[
        {
          heading: 'Acceptance of Terms',
          body: 'By creating an account or using any part of our platform, you confirm that you are at least 16 years old and agree to these Terms of Service and our Privacy Policy.',
        },
        {
          heading: 'Use of the Platform',
          body: 'You may use the platform only for lawful purposes and in accordance with these terms. You agree not to use the platform to distribute unsolicited communications, infringe intellectual property rights, or engage in any conduct that restricts or inhibits others from using the platform.',
        },
        {
          heading: 'Content and Intellectual Property',
          body: 'All content published on Product Slice HQ — including articles, ebooks, templates, and courses — is the intellectual property of its respective authors or Product Slice HQ. You may not reproduce, redistribute, or create derivative works without express written permission.',
        },
        {
          heading: 'Paid Content',
          body: 'Some content requires a one-time purchase. By completing a purchase you gain access to that specific resource. Purchases are processed securely through Paystack. See our Refund Policy for details on refund eligibility.',
        },
        {
          heading: 'Account Termination',
          body: 'We reserve the right to suspend or terminate accounts that violate these terms or are used in ways that harm other users or the integrity of the platform. You may also delete your account at any time by contacting us.',
        },
        {
          heading: 'Limitation of Liability',
          body: 'To the maximum extent permitted by law, Product Slice HQ shall not be liable for any indirect, incidental, or consequential damages arising from your use of the platform. The platform is provided on an "as is" basis.',
        },
      ]}
    />
  )
}

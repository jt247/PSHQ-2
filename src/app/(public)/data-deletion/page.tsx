import { LegalPage } from '@/components/layout/LegalPage'

export default function DataDeletionPage() {
  return (
    <LegalPage
      title="Data Deletion"
      lastUpdated="June 2025"
      intro="You have the right to request deletion of your personal data. This page explains how to exercise that right and what to expect."
      sections={[
        {
          heading: 'What Data We Hold',
          body: 'We hold account information (name, email, job role, country, interests), your interaction history (content viewed and purchased), and any support tickets or messages you have sent us.',
        },
        {
          heading: 'How to Request Deletion',
          body: 'To request the deletion of your account and all associated data, please contact us via our Contact page with the subject line "Data Deletion Request". Include the email address associated with your account.',
        },
        {
          heading: 'Processing Time',
          body: 'We will process your request within 30 days of receipt and confirm once the deletion is complete. In some cases we may need to verify your identity before proceeding.',
        },
        {
          heading: 'What We Retain',
          body: 'We may retain certain records for legal or compliance purposes (such as transaction records required by financial regulations) even after account deletion. Any retained data is the minimum necessary and is not used for any other purpose.',
        },
        {
          heading: 'Effect of Deletion',
          body: 'Once deleted, your account and personal data cannot be recovered. Any content you have purchased will no longer be accessible. This action is permanent.',
        },
      ]}
    />
  )
}

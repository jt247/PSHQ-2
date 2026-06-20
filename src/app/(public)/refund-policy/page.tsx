import { LegalPage } from '@/components/layout/LegalPage'

export default function RefundPolicyPage() {
  return (
    <LegalPage
      title="Refund Policy"
      lastUpdated="June 2025"
      intro="We want you to be satisfied with every resource you purchase on Product Slice HQ. Here is our policy on refunds."
      sections={[
        {
          heading: 'Digital Products',
          body: 'Because our products are digital resources that are immediately accessible upon purchase, we generally do not offer refunds once a purchase is complete and the content has been accessed.',
        },
        {
          heading: 'Eligible Refund Situations',
          body: 'We will issue a full refund if: the content was significantly misrepresented in its description, you were charged in error, or there was a technical failure that prevented you from accessing the content you paid for.',
        },
        {
          heading: 'How to Request a Refund',
          body: 'To request a refund, please contact us via the Contact page within 7 days of purchase. Include your order reference and the reason for your request. We will respond within 3 business days.',
        },
        {
          heading: 'Processing',
          body: 'Approved refunds are returned to the original payment method. Processing times depend on your bank or card provider but typically take 5–10 business days to appear on your statement.',
        },
        {
          heading: 'Subscription Products',
          body: 'If we introduce subscription-based access in future, specific cancellation and pro-rata refund terms will be published and communicated clearly before any subscription is offered.',
        },
      ]}
    />
  )
}

import { LegalPage } from '@/components/layout/LegalPage'

export default function RefundPolicyPage() {
  return (
    <LegalPage
      title="Refund Policy"
      lastUpdated="June 20, 2026"
      intro="This policy explains how refunds work for paid resources and initiatives associated with Product Slice HQ."
      sections={[
        {
          heading: '1. How Paid Resources and Initiatives Work',
          body: "All content directly hosted on Product Slice HQ is free. Paid resources (e-books, templates, courses) and paid initiatives (such as Product Lab with JT) are listed on the Platform for discovery only. When you choose to access one, you are redirected to Selar — the platform where these resources are hosted, sold, and paid for in full. Product Slice HQ handles 0% of payment.",
        },
        {
          heading: '2. We Cannot Process Refunds',
          body: "Because Product Slice HQ never handles any payment, we are not able to process refunds. We do not receive your money, we do not hold it, and we have no ability to return it. All refund requests must be directed to Selar, where your transaction took place.",
        },
        {
          heading: '3. How to Request a Refund',
          body: `To request a refund for a paid resource or initiative, contact Selar directly through their support channels. Your refund will be governed by Selar's refund policy and process.

If you're unsure where to start, you can also email us at hello@productslicehq.com and we'll point you to the right contact at Selar for your specific purchase.`,
        },
        {
          heading: '4. What We Can Help With',
          body: "If you contacted us because you're having trouble reaching Selar, or you need help identifying which Selar listing corresponds to a resource you're trying to access, we're happy to assist. We just cannot process the refund itself — that step happens entirely on Selar's side.",
        },
        {
          heading: '5. Contact Us',
          body: "Questions about this policy? Reach us at hello@productslicehq.com or via our Contact page.",
        },
      ]}
    />
  )
}

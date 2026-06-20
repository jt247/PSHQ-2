import { LegalPage } from '@/components/layout/LegalPage'

export default function RefundPolicyPage() {
  return (
    <LegalPage
      title="Refund Policy"
      lastUpdated="June 20, 2026"
      intro="This policy explains our approach to refunds for paid resources and initiatives associated with Product Slice HQ."
      sections={[
        {
          heading: '1. How Paid Resources Work',
          body: "Content directly hosted on Product Slice HQ (articles, e-books, templates, and courses available on the Platform itself) is free. Some resources are paid and are listed on Product Slice HQ for discovery only — when you choose one, you're directed via a payment link to a third-party platform (such as Selar) or a direct payment link (such as Paystack or Flutterwave) tied to the founder's personal or business account, where payment is completed and access or delivery instructions are provided. Live initiatives (such as Product Lab with JT) follow the same model.",
        },
        {
          heading: '2. General Policy: No Refunds',
          body: `All payments for paid resources and initiatives are final. There is no money-back guarantee, and refunds are not available once a resource has been accessed, downloaded, or delivered, or once a live initiative has been attended or access granted.

We take this position because:
• Once you've downloaded a resource or accessed a course, we've already delivered the value you paid for — we have no way to "take it back," so we can't refund a transaction for a digital product that's already been delivered
• For live initiatives, once a session has been delivered or recordings shared, the same logic applies`,
        },
        {
          heading: '3. The One Exception: Payment Without Access',
          body: `If you pay for a resource or initiative and a technical fault on our end or the hosting platform's end prevents you from actually accessing or receiving what you paid for, and we're able to confirm this from our records, we will work with you to either:
• Resolve the access issue so you receive what you paid for, or
• Process a refund, if access genuinely cannot be restored

To request this, contact us within 7 days of payment at hello@productslicehq.com with:
• Your email address used for payment
• The resource or initiative purchased
• The payment reference/receipt from Selar, Paystack, or Flutterwave
• A description of the access issue

We'll investigate and respond within 5 business days. Refunds approved under this exception are processed back to your original payment method, through whichever platform handled the original transaction — processing times depend on that platform and your bank.`,
        },
        {
          heading: '4. What This Policy Does Not Cover',
          body: `This policy does not cover:
• Change of mind after purchase
• Not having enough time to use a resource or attend an initiative
• Dissatisfaction with the content itself, once it has been successfully delivered and accessed

We encourage you to review free content, testimonials, or descriptions carefully before purchasing, since paid resources are not refundable on the basis of preference once delivered.`,
        },
        {
          heading: '5. Third-Party Platform Policies',
          body: "Because payment is processed by Selar, Paystack, Flutterwave, or similar platforms rather than directly on Product Slice HQ, that platform's own refund/dispute process may also apply. We encourage you to review their terms as well.",
        },
        {
          heading: '6. Chargebacks',
          body: "If you initiate a chargeback or payment dispute without first contacting us to resolve the issue under Section 3, we reserve the right to restrict your access to future resources and initiatives while the dispute is investigated.",
        },
        {
          heading: '7. Contact Us',
          body: "Questions about a purchase or this policy? Reach us at hello@productslicehq.com or via our Contact page.",
        },
      ]}
    />
  )
}

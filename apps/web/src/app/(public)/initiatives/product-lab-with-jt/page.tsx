import { redirect } from 'next/navigation'

// Product Lab moved to /initiatives/product-lab per Epic B restructure —
// this route stays live (redirect, not deleted) so the old public URL
// never 404s. The initiatives table's row itself was renamed to match.
export default function ProductLabWithJtRedirect() {
  redirect('/initiatives/product-lab')
}

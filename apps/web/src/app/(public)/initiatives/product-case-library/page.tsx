import { redirect } from 'next/navigation'

// Case Library moved to /cases per Epic B restructure — this route stays
// live (redirect, not deleted) so the old public URL never 404s.
export default function ProductCaseLibraryRedirect() {
  redirect('/cases')
}

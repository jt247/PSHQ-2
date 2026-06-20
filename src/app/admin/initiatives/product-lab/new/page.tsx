import Link from 'next/link'
import { EditionForm } from '@/components/admin/initiatives/EditionForm'
import { createEditionAction } from '../actions'

export default function NewEditionPage() {
  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <Link href="/admin/initiatives/product-lab" className="back-link">← Product Lab</Link>
          <h1>New edition</h1>
        </div>
      </div>
      <div className="admin-card" style={{ padding: '1.5rem' }}>
        <EditionForm action={createEditionAction} backHref="/admin/initiatives/product-lab" />
      </div>
    </div>
  )
}

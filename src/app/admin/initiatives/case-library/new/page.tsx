import Link from 'next/link'
import { CaseEntryForm } from '@/components/admin/initiatives/CaseEntryForm'
import { createCaseEntryAction } from '../actions'

export default function NewCaseEntryPage() {
  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <Link href="/admin/initiatives/case-library" className="back-link">← Case Library</Link>
          <h1>New case entry</h1>
        </div>
      </div>
      <div className="admin-card" style={{ padding: '1.5rem' }}>
        <CaseEntryForm action={createCaseEntryAction} backHref="/admin/initiatives/case-library" />
      </div>
    </div>
  )
}

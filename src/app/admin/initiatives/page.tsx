import Link from 'next/link'

export default function AdminInitiativesPage() {
  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Initiatives</h1>
          <p className="admin-page-subtitle">Manage all three initiative programmes</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        {[
          {
            href: '/admin/initiatives/product-lab',
            label: 'Product Lab with JT',
            desc: 'Manage cohort editions, stats, and join instructions',
            meta: 'Editions 1.0 · 2.0 · 3.0',
          },
          {
            href: '/admin/initiatives/case-library',
            label: 'Product Case Library',
            desc: 'Publish case studies, manage attached files',
            meta: 'Entries + file attachments',
          },
          {
            href: '/admin/initiatives/curriculum',
            label: 'Open PM Curriculum',
            desc: 'Publish pathways, add and reorder stages',
            meta: '6 pathways · 5 stages each',
          },
        ].map(item => (
          <Link key={item.href} href={item.href} style={{
            display: 'flex', flexDirection: 'column', gap: '0.5rem',
            padding: '1.5rem',
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '0.5rem',
            textDecoration: 'none',
            transition: 'border-color 150ms, box-shadow 150ms',
          }}>
            <span style={{ fontWeight: 700, fontSize: '1rem', color: '#111827' }}>{item.label}</span>
            <span style={{ fontSize: '0.875rem', color: '#6b7280', lineHeight: 1.5 }}>{item.desc}</span>
            <span style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem', fontFamily: 'monospace' }}>{item.meta}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

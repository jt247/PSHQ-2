export default function AdminPage() {
  return (
    <div>
      <header style={{ marginBottom: '2.5rem' }}>
        <p className="text-label-sm" style={{ color: 'var(--color-accent-warm)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.5rem' }}>
          Admin
        </p>
        <h1 className="text-headline-xl" style={{ color: 'var(--color-ink-deep)', marginBottom: '0.5rem' }}>
          Tactical Operations Center
        </h1>
        <p className="text-body-lg" style={{ color: 'var(--color-text-muted)' }}>
          Platform health, content, and team management.
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
        {[
          { label: 'Content', icon: '📄', href: '/admin/content', desc: 'Manage published content' },
          { label: 'Users', icon: '👥', href: '/admin/team', desc: 'View and manage members' },
          { label: 'Support', icon: '💬', href: '/admin/support', desc: 'Open tickets' },
          { label: 'Analytics', icon: '📊', href: '/admin/analytics/platform', desc: 'Platform metrics' },
        ].map(item => (
          <a key={item.href} href={item.href} style={{
            display: 'flex', flexDirection: 'column', gap: '0.5rem',
            padding: '1.25rem',
            background: '#ffffff',
            border: '1px solid color-mix(in srgb, var(--color-tertiary) 10%, transparent)',
            borderRadius: '0.5rem',
            textDecoration: 'none',
            transition: 'border-color 150ms',
          }}>
            <span style={{ fontSize: '1.25rem' }}>{item.icon}</span>
            <span className="text-body-md" style={{ fontWeight: 600, color: 'var(--color-ink-deep)' }}>{item.label}</span>
            <span className="text-label-sm" style={{ color: 'var(--color-text-muted)' }}>{item.desc}</span>
          </a>
        ))}
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'

interface Notification {
  id: string
  title: string
  message: string
  created_at: string
  read_at: string | null
}

interface Props {
  userId: string
}

export function NotificationBell({ userId }: Props) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const unread = notifications.filter(n => !n.read_at).length

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    setLoading(true)
    supabase
      .from('notification_recipients')
      .select('id, read_at, notification:notification_id(id, title, message, created_at)')
      .eq('user_id', userId)
      .order('created_at', { foreignTable: 'notification_id', ascending: false })
      .limit(20)
      .then(({ data }) => {
        const rows = ((data ?? []) as unknown[]) as Array<{ id: string; read_at: string | null; notification: { id: string; title: string; message: string; created_at: string } | null }>
        setNotifications(
          rows
            .filter(r => r.notification)
            .map(r => ({ ...r.notification!, id: r.id, read_at: r.read_at }))
        )
        setLoading(false)
      })
  }, [userId])

  async function markAllRead() {
    const unreadIds = notifications.filter(n => !n.read_at).map(n => n.id)
    if (!unreadIds.length) return
    await fetch('/api/notifications/mark-read', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: unreadIds }),
    })
    setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })))
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => { setOpen(o => !o); if (!open && unread) markAllRead() }}
        style={bellBtn}
        aria-label="Notifications"
      >
        🔔
        {unread > 0 && (
          <span style={badge}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open && (
        <div style={dropdown}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: '#111827' }}>Notifications</span>
          </div>
          {loading ? (
            <div style={emptyMsg}>Loading…</div>
          ) : notifications.length === 0 ? (
            <div style={emptyMsg}>No notifications yet.</div>
          ) : (
            <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
              {notifications.map(n => (
                <div key={n.id} style={{ ...notifItem, background: n.read_at ? '#fff' : '#f0f4ff' }}>
                  <p style={{ margin: '0 0 0.125rem', fontWeight: n.read_at ? 400 : 600, fontSize: '0.875rem', color: '#111827' }}>{n.title}</p>
                  <p style={{ margin: 0, fontSize: '0.8125rem', color: '#6b7280', lineHeight: 1.5 }}>{n.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const bellBtn: React.CSSProperties = { position: 'relative', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.125rem', padding: '0.25rem', display: 'flex', alignItems: 'center' }
const badge: React.CSSProperties = { position: 'absolute', top: '-4px', right: '-4px', background: '#ef4444', color: '#fff', borderRadius: '9999px', fontSize: '0.625rem', fontWeight: 700, width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }
const dropdown: React.CSSProperties = { position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: '320px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 100 }
const emptyMsg: React.CSSProperties = { padding: '2rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem' }
const notifItem: React.CSSProperties = { padding: '0.75rem 1rem', borderBottom: '1px solid #f9fafb' }

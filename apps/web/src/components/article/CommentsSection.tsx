'use client'

import { useActionState } from 'react'
import { postCommentAction, type CommentState } from '@/app/(public)/articles/[slug]/actions'

interface Comment {
  id: string
  body: string
  is_deleted: boolean
  created_at: string
  user: { full_name: string | null; email: string } | null
}

interface Props {
  contentId: string
  comments: Comment[]
  isLoggedIn: boolean
}

const initState: CommentState = {}

export function CommentsSection({ contentId, comments, isLoggedIn }: Props) {
  const boundAction = postCommentAction.bind(null, contentId)
  const [state, formAction, isPending] = useActionState(boundAction, initState)

  return (
    <section style={{ marginTop: '2.5rem', borderTop: '1px solid #e5e7eb', paddingTop: '2rem' }}>
      <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#111827', margin: '0 0 1.25rem' }}>
        Comments ({comments.filter(c => !c.is_deleted).length})
      </h2>

      {/* Comment form */}
      {isLoggedIn ? (
        <form action={formAction} style={{ marginBottom: '2rem' }}>
          <textarea
            name="body"
            placeholder="Share your thoughts…"
            required
            minLength={2}
            maxLength={2000}
            rows={3}
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '0.625rem 0.75rem',
              border: `1px solid ${state.error ? '#fca5a5' : '#d1d5db'}`,
              borderRadius: '8px', fontSize: '0.9375rem',
              fontFamily: 'inherit', resize: 'vertical',
              outline: 'none',
            }}
          />
          {state.error && (
            <p style={{ color: '#b91c1c', fontSize: '0.8125rem', margin: '0.25rem 0 0' }}>{state.error}</p>
          )}
          {state.success && (
            <p style={{ color: '#15803d', fontSize: '0.8125rem', margin: '0.25rem 0 0' }}>Comment posted!</p>
          )}
          <button
            type="submit"
            disabled={isPending}
            style={{
              marginTop: '0.5rem',
              padding: '0.4375rem 1rem',
              background: '#111827', color: '#fff',
              border: 'none', borderRadius: '6px',
              fontSize: '0.875rem', fontWeight: 500,
              cursor: isPending ? 'not-allowed' : 'pointer',
              opacity: isPending ? 0.7 : 1,
            }}
          >
            {isPending ? 'Posting…' : 'Post comment'}
          </button>
        </form>
      ) : (
        <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          <a href="/sign-in" style={{ color: '#6366f1' }}>Sign in</a> to comment.
        </p>
      )}

      {/* Comment list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {comments.length === 0 && (
          <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>No comments yet. Be the first!</p>
        )}
        {comments.map(c => {
          if (c.is_deleted) {
            return (
              <div key={c.id} style={{ padding: '0.75rem', borderRadius: '8px', background: '#f9fafb' }}>
                <p style={{ margin: 0, color: '#9ca3af', fontStyle: 'italic', fontSize: '0.875rem' }}>
                  [Comment removed]
                </p>
              </div>
            )
          }

          const name = c.user?.full_name || c.user?.email?.split('@')[0] || 'Member'
          const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
          const date = new Date(c.created_at).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })

          return (
            <div key={c.id} style={{
              padding: '0.875rem 1rem',
              border: '1px solid #f3f4f6',
              borderRadius: '8px',
              background: '#fff',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.5rem' }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: '#6366f1', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.6875rem', fontWeight: 700, flexShrink: 0,
                }}>
                  {initials}
                </div>
                <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#111827' }}>{name}</span>
                <span style={{ fontSize: '0.75rem', color: '#9ca3af', marginLeft: 'auto' }}>{date}</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.9375rem', color: '#374151', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {c.body}
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}

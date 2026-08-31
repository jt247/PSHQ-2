'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

interface MobileNavToggleProps {
  /** Class applied to <body> while open — CSS elsewhere reacts to this to slide the target sidebar/nav into view. */
  openBodyClass: string
  /** Color of the hamburger/close icon, matched to the surrounding header. */
  color?: string
}

// Duplicated from apps/web's component of the same name rather than shared
// via packages/ui — small, self-contained, and the two apps' sidebars are
// styled independently. Revisit if this drifts into real duplication pain.
export function MobileNavToggle({ openBodyClass, color = 'currentColor' }: MobileNavToggleProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Close on navigation — layouts persist across route changes in the App Router.
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    document.body.classList.toggle(openBodyClass, open)
    return () => { document.body.classList.remove(openBodyClass) }
  }, [open, openBodyClass])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <button
        type="button"
        className="mobile-nav-toggle-btn"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        style={{ color }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          {open ? (
            <path d="M6 6l12 12M18 6L6 18" />
          ) : (
            <path d="M4 7h16M4 12h16M4 17h16" />
          )}
        </svg>
      </button>
      {open && <div className="mobile-nav-backdrop" onClick={() => setOpen(false)} />}
    </>
  )
}

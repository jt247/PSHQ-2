'use client'

import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'
import { createClient } from '@pshq/api-client/client'
import { trackCtaClicked } from '@pshq/analytics'

interface Props {
  href: string
  section: string
  label: string
  className?: string
  style?: CSSProperties
  children: ReactNode
}

export function CtaLink({ href, section, label, className, style, children }: Props) {
  function handleClick() {
    // Fire-and-forget — never block or delay the actual navigation.
    ;(async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        await trackCtaClicked({ supabase, source: 'web', userId: user?.id ?? null }, section, label)
      } catch { /* non-fatal */ }
    })()
  }

  return (
    <Link href={href} className={className} style={style} onClick={handleClick}>
      {children}
    </Link>
  )
}

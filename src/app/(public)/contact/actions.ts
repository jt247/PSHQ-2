'use server'

import { headers } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'
import { rateLimit, clientIp } from '@/lib/ratelimit'

export interface ContactState {
  error?: string
  success?: boolean
  ticketNumber?: number
}

export async function createServiceContactAction(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  // Honeypot: real users never see this field. A filled value means a bot —
  // return success so the bot learns nothing, but write nothing.
  if ((formData.get('website') as string ?? '').trim()) {
    return { success: true, ticketNumber: 0 }
  }

  const ip = clientIp(await headers())
  const allowed = await rateLimit('contact', ip, 3, 600) // 3 messages per 10 min per IP
  if (!allowed) {
    return { error: 'Too many messages. Please wait a few minutes and try again.' }
  }

  const name        = (formData.get('name')        as string ?? '').trim().slice(0, 100)
  const email       = (formData.get('email')       as string ?? '').trim().slice(0, 254)
  const subject     = (formData.get('subject')     as string ?? '').trim().slice(0, 200)
  const description = (formData.get('description') as string ?? '').trim().slice(0, 5000)

  if (!name || !email || !subject || !description) {
    return { error: 'All fields are required.' }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Enter a valid email address.' }
  }
  if (description.length < 10) return { error: 'Message is too short.' }

  // Use service role so anonymous users can insert (no auth session)
  const service = createServiceClient()

  const { data, error } = await service
    .from('support_tickets')
    .insert({
      user_id: null,
      email,
      subject: `[Contact] ${subject}`,
      description: `From: ${name} <${email}>\n\n${description}`,
      priority: 'medium',
    })
    .select('ticket_number')
    .single()

  if (error || !data) return { error: 'Failed to send message. Please try again.' }

  return { success: true, ticketNumber: (data as Record<string, unknown>).ticket_number as number }
}

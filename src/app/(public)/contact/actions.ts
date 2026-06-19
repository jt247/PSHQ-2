'use server'

import { createServiceClient } from '@/lib/supabase/server'

export interface ContactState {
  error?: string
  success?: boolean
  ticketNumber?: number
}

export async function createServiceContactAction(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const name        = (formData.get('name')        as string ?? '').trim()
  const email       = (formData.get('email')       as string ?? '').trim()
  const subject     = (formData.get('subject')     as string ?? '').trim()
  const description = (formData.get('description') as string ?? '').trim()

  if (!name || !email || !subject || !description) {
    return { error: 'All fields are required.' }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Enter a valid email address.' }
  }
  if (description.length < 10) return { error: 'Message is too short.' }

  // Use service role so anonymous users can insert (no auth session)
  const service = await createServiceClient()

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

// One-off reconciliation: content.upvote_count drifted away from the actual
// rows in content_upvotes (16 real upvotes, 13 content rows reading wrong).
// The sync_content_upvote_count trigger is present and fires correctly on new
// votes, so this only repairs the existing drift.
import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
const env = readFileSync('.env.local','utf-8')
const V = Object.fromEntries(env.split('\n').filter(l=>l&&!l.startsWith('#')&&l.includes('=')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^"|"$/g,'')]}))
const admin = createClient(V.NEXT_PUBLIC_SUPABASE_URL, V.SUPABASE_SERVICE_ROLE_KEY)

const { data: votes } = await admin.from('content_upvotes').select('content_id')
const tally = {}; (votes ?? []).forEach(r => tally[r.content_id] = (tally[r.content_id] || 0) + 1)

const { data: all } = await admin.from('content').select('id,slug,type,upvote_count')
let fixed = 0
for (const c of all) {
  const real = tally[c.id] ?? 0
  if (real === c.upvote_count) continue
  const { error } = await admin.from('content').update({ upvote_count: real }).eq('id', c.id)
  if (error) { console.log('FAIL', c.slug, error.message); continue }
  console.log(`fixed ${c.type.padEnd(9)} ${c.slug.slice(0,46).padEnd(48)} ${c.upvote_count} -> ${real}`)
  fixed++
}
console.log(`\nreconciled ${fixed} rows`)

const { data: after } = await admin.from('content').select('id,slug,upvote_count')
const remaining = after.filter(c => (tally[c.id] ?? 0) !== c.upvote_count)
console.log('remaining mismatches:', remaining.length)

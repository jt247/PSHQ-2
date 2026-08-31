// Preset areas of interest offered as chips in onboarding and settings.
//
// An earlier version of onboarding shipped its own separate list containing
// 'Product Analytics', 'Leadership', 'Design' and 'Engineering'. When the two
// lists were merged onto this one, those four values stayed behind in existing
// user rows with no chip to represent them, so the picker counted them toward
// the limit while showing nothing selected. That produced the "7/7 selected"
// state with only 5 chips lit and every remaining chip disabled, which no user
// could get out of. 'Leadership' and 'Engineering' are kept here because they
// have no equivalent; the other two were migrated onto their modern names.
// Anything still unmatched now renders as a removable custom tag instead of
// silently occupying a slot.
export const AREAS: string[] = [
  'Product Strategy', 'User Research', 'Roadmapping', 'Agile / Scrum',
  'Data & Analytics', 'Growth', 'B2B SaaS', 'Consumer Products',
  'Fintech', 'HealthTech', 'EdTech', 'E-commerce', 'API Products',
  'Platform Products', 'AI Products', 'Mobile', 'Enterprise',
  'Product Operations', 'Design Thinking', 'Stakeholder Management',
  'Leadership', 'Engineering',
]

// Maximum preset chips a user may select. Custom tags added through "Other"
// are bounded separately so the cap on presets cannot lock anyone out.
export const MAX_AREAS = 7

// Bounds on user-authored tags. Not a product requirement, a guard so a free
// text field cannot write unbounded data into the row.
export const MAX_CUSTOM_AREAS = 10
export const MAX_CUSTOM_AREA_LENGTH = 40

// Server-side bound for whatever the client submits. Presets and custom tags
// are capped independently, so a full preset selection can never crowd out a
// user's own tags (or the reverse) by arriving first in the form data.
export function sanitizeAreas(raw: string[]): string[] {
  const seen = new Set<string>()
  const presets: string[] = []
  const custom: string[] = []

  for (const value of raw) {
    const v = (value ?? '').trim().replace(/\s+/g, ' ')
    if (!v) continue
    const key = v.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)

    if (AREAS.includes(v)) {
      if (presets.length < MAX_AREAS) presets.push(v)
    } else if (custom.length < MAX_CUSTOM_AREAS) {
      custom.push(v.slice(0, MAX_CUSTOM_AREA_LENGTH))
    }
  }

  return [...presets, ...custom]
}

// Splits "Fintech, Payments , Growth loops" into clean, deduplicated tags.
export function parseCustomAreas(raw: string): string[] {
  const seen = new Set<string>()
  return raw
    .split(',')
    .map(s => s.trim().replace(/\s+/g, ' '))
    .filter(s => s.length > 0 && s.length <= MAX_CUSTOM_AREA_LENGTH)
    .filter(s => {
      const key = s.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

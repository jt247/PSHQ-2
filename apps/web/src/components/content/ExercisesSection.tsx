import { createClient } from '@pshq/api-client/server'
import { ExerciseWidget } from './ExerciseWidget'

interface Exercise { id: string; prompt: string; sequence: number }

export async function ExercisesSection({ contentId, isLoggedIn }: { contentId: string; isLoggedIn: boolean }) {
  const supabase = await createClient()
  const { data: exercises } = await supabase.from('exercises').select('id, prompt, sequence').eq('content_id', contentId).order('sequence')
  if (!exercises || exercises.length === 0) return null

  let responses = new Map<string, string>()
  if (isLoggedIn) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: rows } = await supabase.from('exercise_responses').select('exercise_id, response').eq('user_id', user.id).in('exercise_id', exercises.map(e => e.id))
      responses = new Map((rows ?? []).map(r => [r.exercise_id, (r.response as { text?: string })?.text ?? '']))
    }
  }

  return (
    <div style={{ marginBottom: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h2 className="text-headline-md" style={{ color: 'var(--color-ink-deep)', margin: 0 }}>Try it yourself</h2>
      {(exercises as Exercise[]).map(ex => (
        <ExerciseWidget
          key={ex.id}
          exerciseId={ex.id}
          prompt={ex.prompt}
          initialResponse={responses.get(ex.id) ?? null}
          isLoggedIn={isLoggedIn}
        />
      ))}
    </div>
  )
}

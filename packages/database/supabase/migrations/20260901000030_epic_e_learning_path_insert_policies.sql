-- ----------------------------------------------------------
-- Fix: Create My Learning Path was failing with a 502 on every attempt.
--
-- Root cause, found via live testing after the Epic E migration landed:
-- `learning_paths` and `learning_path_modules` have only ever had a
-- public-read SELECT policy (Build Prompt 3/Epic B) — curated paths are
-- authored by admins via the service-role client in apps/admin, so no one
-- ever needed a regular-user INSERT policy on these tables before.
-- Create My Learning Path writes through the member's own RLS-bound
-- client (same pattern as content_favorites/content_progress elsewhere in
-- this app), and RLS silently rejected the insert with no INSERT policy
-- to satisfy — surfaced as a generic "Failed to save learning path"
-- error in the route, correctly caught, but caused by a missing policy,
-- not a code bug in the AI pipeline itself.
--
-- Scoped tightly: a member can only insert a learning_paths row that's
-- both theirs (created_by = auth.uid()) AND explicitly source =
-- 'ai_generated' — this can never be used to sneak a row into the
-- publicly-listed curated set, which stays admin/service-role only.
-- ----------------------------------------------------------

create policy "learning_paths: self insert own ai_generated"
  on public.learning_paths for insert
  with check (created_by = auth.uid() and source = 'ai_generated');

create policy "learning_path_modules: self insert for own ai_generated path"
  on public.learning_path_modules for insert
  with check (
    exists (
      select 1 from public.learning_paths lp
      where lp.id = learning_path_id
        and lp.created_by = auth.uid()
        and lp.source = 'ai_generated'
    )
  );

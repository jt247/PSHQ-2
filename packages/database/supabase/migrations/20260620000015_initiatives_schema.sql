-- Migration 015: Initiatives schema — new dedicated tables

-- ── Enums ──────────────────────────────────────────────────────────────────
CREATE TYPE public.initiative_status     AS ENUM ('live', 'coming_soon', 'archived');
CREATE TYPE public.edition_status        AS ENUM ('completed', 'open', 'coming_soon');
CREATE TYPE public.edition_join_method   AS ENUM ('invitation_email', 'open');
CREATE TYPE public.case_entry_status     AS ENUM ('published', 'draft');
CREATE TYPE public.pathway_status        AS ENUM ('live', 'coming_soon');

-- ── initiatives ────────────────────────────────────────────────────────────
CREATE TABLE public.initiatives (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                  text NOT NULL UNIQUE,
  title                 text NOT NULL,
  short_description     text,
  hero_description      text,
  icon_or_thumbnail_url text,
  status                public.initiative_status NOT NULL DEFAULT 'coming_soon',
  display_order         integer NOT NULL DEFAULT 0,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- ── initiative_editions ────────────────────────────────────────────────────
CREATE TABLE public.initiative_editions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id     uuid NOT NULL REFERENCES public.initiatives (id) ON DELETE CASCADE,
  edition_number    text NOT NULL,
  title             text NOT NULL,
  focus_description text,
  status            public.edition_status NOT NULL DEFAULT 'coming_soon',
  join_method       public.edition_join_method,
  join_instructions text,
  stats             jsonb NOT NULL DEFAULT '{}',
  display_order     integer NOT NULL DEFAULT 0
);

-- ── case_library_entries ───────────────────────────────────────────────────
CREATE TABLE public.case_library_entries (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  company_name  text NOT NULL,
  description   text,
  thumbnail_url text,
  tags          text[] NOT NULL DEFAULT '{}',
  status        public.case_entry_status NOT NULL DEFAULT 'draft',
  created_by    uuid REFERENCES public.users (id) ON DELETE SET NULL,
  published_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ── case_library_files ─────────────────────────────────────────────────────
CREATE TABLE public.case_library_files (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id   uuid NOT NULL REFERENCES public.case_library_entries (id) ON DELETE CASCADE,
  file_url   text NOT NULL,
  file_label text,
  file_type  text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── curriculum_pathways ────────────────────────────────────────────────────
CREATE TABLE public.curriculum_pathways (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text NOT NULL UNIQUE,
  title         text NOT NULL,
  description   text,
  icon_url      text,
  status        public.pathway_status NOT NULL DEFAULT 'coming_soon',
  display_order integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ── curriculum_stages ──────────────────────────────────────────────────────
CREATE TABLE public.curriculum_stages (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pathway_id        uuid NOT NULL REFERENCES public.curriculum_pathways (id) ON DELETE CASCADE,
  stage_number      integer NOT NULL,
  title             text NOT NULL,
  description       text,
  what_to_focus_on  text,
  display_order     integer NOT NULL DEFAULT 0
);

-- ── Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX ON public.initiatives (status, display_order);
CREATE INDEX ON public.initiative_editions (initiative_id, display_order DESC);
CREATE INDEX ON public.case_library_entries (status, published_at DESC);
CREATE INDEX ON public.case_library_files (entry_id);
CREATE INDEX ON public.curriculum_pathways (status, display_order);
CREATE INDEX ON public.curriculum_stages (pathway_id, display_order);

-- ── RLS — public read, admin writes via service client ────────────────────
ALTER TABLE public.initiatives           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.initiative_editions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_library_entries  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_library_files    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_pathways   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_stages     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read initiatives"          ON public.initiatives           FOR SELECT USING (true);
CREATE POLICY "public read initiative_editions"  ON public.initiative_editions   FOR SELECT USING (true);
CREATE POLICY "public read case_entries"         ON public.case_library_entries  FOR SELECT USING (status = 'published');
CREATE POLICY "public read case_files"           ON public.case_library_files    FOR SELECT USING (true);
CREATE POLICY "public read pathways"             ON public.curriculum_pathways   FOR SELECT USING (true);
CREATE POLICY "public read stages"               ON public.curriculum_stages     FOR SELECT USING (true);

-- ── updated_at trigger ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER initiatives_updated_at
  BEFORE UPDATE ON public.initiatives
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER case_entries_updated_at
  BEFORE UPDATE ON public.case_library_entries
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER pathways_updated_at
  BEFORE UPDATE ON public.curriculum_pathways
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ── Seed 3 initiatives ─────────────────────────────────────────────────────
INSERT INTO public.initiatives (slug, title, short_description, hero_description, status, display_order)
VALUES
(
  'product-lab-with-jt',
  'Product Lab with JT',
  'A hands-on cohort for product practitioners who want to build real intuition — through live sessions, peer critique, and direct access to JT.',
  'Product Lab with JT is a structured cohort experience for practitioners who want more than content. Each edition runs for a fixed period with a specific focus area, live sessions, peer critique, and direct access to JT. Past participants have landed internships, picked up paid gigs, and shipped real product work.',
  'live',
  1
),
(
  'product-case-library',
  'Product Case Library',
  'A growing archive of real product teardowns — how teams across Africa and beyond built, iterated, and scaled their products.',
  'The Product Case Library is a curated archive of product teardowns and case studies documenting real decisions, real tradeoffs, and real outcomes. Each case goes beyond the press release to show how teams actually built, shipped, and iterated.',
  'live',
  2
),
(
  'open-pm-curriculum',
  'Open PM Curriculum',
  'A freely available, structured learning path covering product fundamentals, analytics, strategy, and leadership — built for African product practitioners.',
  'The Open PM Curriculum is a structured, freely available learning path for product practitioners at every stage. Built from the ground up for the African product context — practical, opinionated, and designed to close the gap between theory and real-world product work.',
  'coming_soon',
  3
);

-- Curriculum hierarchy and educational content.
-- Grade → (stream) → subject → curriculum edition → unit → topic (chapter) → lesson → section.

create table public.content_sources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  kind public.source_kind not null,
  publisher text,
  url text,
  license text,
  permission_status public.permission_status not null default 'unknown',
  attribution text,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger content_sources_updated_at before update on public.content_sources
  for each row execute function public.set_updated_at();

create table public.curriculum_editions (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects (id) on delete restrict,
  grade_id uuid not null references public.grades (id) on delete restrict,
  stream public.study_stream,
  name text not null,
  published_year smallint check (published_year between 1990 and 2100),
  source_id uuid references public.content_sources (id) on delete set null,
  is_current boolean not null default false,
  status public.content_status not null default 'draft',
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (subject_id, grade_id, stream, name)
);
-- At most one current edition per subject/grade/stream.
create unique index curriculum_editions_one_current
  on public.curriculum_editions (subject_id, grade_id, stream) nulls not distinct
  where is_current;
create trigger curriculum_editions_updated_at before update on public.curriculum_editions
  for each row execute function public.set_updated_at();

create table public.units (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.curriculum_editions (id) on delete cascade,
  position smallint not null check (position > 0),
  title text not null,
  status public.content_status not null default 'draft',
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (edition_id, position)
);
create trigger units_updated_at before update on public.units
  for each row execute function public.set_updated_at();

-- A topic is a student-facing chapter (parent_topic_id null) or a sub-topic.
-- Slugs are globally unique because they appear in URLs (/learn/<slug>).
create table public.topics (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units (id) on delete cascade,
  parent_topic_id uuid references public.topics (id) on delete cascade,
  slug public.slug not null unique,
  position smallint not null check (position > 0),
  title text not null,
  tagline text not null default '',
  learning_objectives text[] not null default '{}',
  status public.content_status not null default 'draft',
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index topics_position_unique
  on public.topics (unit_id, coalesce(parent_topic_id, '00000000-0000-0000-0000-000000000000'::uuid), position);
create index topics_parent_idx on public.topics (parent_topic_id);
create trigger topics_updated_at before update on public.topics
  for each row execute function public.set_updated_at();

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics (id) on delete cascade,
  kind public.lesson_kind not null,
  title text not null,
  source_id uuid references public.content_sources (id) on delete set null,
  status public.content_status not null default 'draft',
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (topic_id, kind)
);
create trigger lessons_updated_at before update on public.lessons
  for each row execute function public.set_updated_at();

create table public.lesson_sections (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  position smallint not null check (position > 0),
  kind public.lesson_section_kind not null,
  heading text,
  body text not null,
  data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lesson_id, position)
);
create trigger lesson_sections_updated_at before update on public.lesson_sections
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Videos (YouTube metadata only; videos are never downloaded or rehosted)
-- ---------------------------------------------------------------------------

create table public.videos (
  id uuid primary key default gen_random_uuid(),
  youtube_video_id text not null unique check (youtube_video_id ~ '^[A-Za-z0-9_-]{11}$'),
  title text not null,
  channel_id text not null,
  channel_name text not null,
  thumbnail_url text,
  description text,
  duration_seconds integer check (duration_seconds is null or duration_seconds > 0),
  language text not null default 'en',
  source_url text generated always as ('https://www.youtube.com/watch?v=' || youtube_video_id) stored,
  is_embeddable boolean,
  is_available boolean not null default true,
  review_status public.content_status not null default 'draft',
  discovered_at timestamptz not null default now(),
  metadata_refreshed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Only embeddable, available videos can be published.
  constraint videos_publishable check (
    review_status <> 'published' or (is_embeddable is true and is_available)
  )
);
create index videos_channel_idx on public.videos (channel_id);
create trigger videos_updated_at before update on public.videos
  for each row execute function public.set_updated_at();

create table public.video_topic_links (
  video_id uuid not null references public.videos (id) on delete cascade,
  topic_id uuid not null references public.topics (id) on delete cascade,
  confidence numeric(4, 3) check (confidence between 0 and 1),
  is_primary boolean not null default false,
  status public.content_status not null default 'draft',
  linked_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (video_id, topic_id)
);
create index video_topic_links_topic_idx on public.video_topic_links (topic_id);

-- ---------------------------------------------------------------------------
-- Exam papers and questions
-- ---------------------------------------------------------------------------

create table public.exam_papers (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects (id) on delete restrict,
  grade_id uuid references public.grades (id) on delete restrict,
  stream public.study_stream,
  exam_year smallint not null check (exam_year between 1990 and 2100),
  session text,
  variant text,
  -- Every official paper must record where it came from.
  source_id uuid not null references public.content_sources (id) on delete restrict,
  page_count smallint check (page_count > 0),
  status public.content_status not null default 'draft',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (subject_id, stream, exam_year, session, variant)
);
create trigger exam_papers_updated_at before update on public.exam_papers
  for each row execute function public.set_updated_at();

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  origin public.question_origin not null,
  type public.question_type not null default 'multiple_choice',
  prompt text not null check (char_length(prompt) > 0),
  explanation text,
  hints text[] not null default '{}',
  subject_id uuid not null references public.subjects (id) on delete restrict,
  grade_id uuid references public.grades (id) on delete restrict,
  difficulty smallint check (difficulty between 1 and 5),
  exam_paper_id uuid references public.exam_papers (id) on delete restrict,
  source_page smallint check (source_page > 0),
  source_question_number text,
  image_paths text[] not null default '{}',
  generated_by_model text,
  status public.content_status not null default 'draft',
  is_demo boolean not null default false,
  verified_by uuid references public.profiles (id) on delete set null,
  verified_at timestamptz,
  verification_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Official past questions need full provenance and are never demo content.
  constraint questions_official_provenance check (
    origin <> 'official_past_exam'
    or (exam_paper_id is not null and source_question_number is not null and not is_demo)
  ),
  -- Only official questions may point at an exam paper.
  constraint questions_paper_only_official check (origin = 'official_past_exam' or exam_paper_id is null),
  -- AI-generated questions must say which model produced them.
  constraint questions_ai_model check (origin <> 'ai_generated' or generated_by_model is not null),
  -- Nothing official is published without human verification.
  constraint questions_official_verified check (
    not (origin = 'official_past_exam' and status = 'published') or verified_at is not null
  ),
  -- Published questions must have an explanation.
  constraint questions_published_explained check (status <> 'published' or explanation is not null)
);
create index questions_subject_status_idx on public.questions (subject_id, status);
create index questions_exam_paper_idx on public.questions (exam_paper_id);
create trigger questions_updated_at before update on public.questions
  for each row execute function public.set_updated_at();

create table public.question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  position smallint not null check (position > 0),
  label text not null check (char_length(label) between 1 and 2),
  body text not null,
  is_correct boolean not null default false,
  created_at timestamptz not null default now(),
  unique (question_id, position),
  unique (question_id, label)
);
-- Exactly one correct option per multiple-choice question (at most one here;
-- "at least one" is checked when publishing).
create unique index question_options_one_correct on public.question_options (question_id) where is_correct;

create table public.question_topic_links (
  question_id uuid not null references public.questions (id) on delete cascade,
  topic_id uuid not null references public.topics (id) on delete cascade,
  is_primary boolean not null default true,
  position smallint,
  primary key (question_id, topic_id)
);
create index question_topic_links_topic_idx on public.question_topic_links (topic_id);

-- A question cannot be published unless it has exactly one correct option.
create function public.check_question_publishable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published' and (
    select count(*) from public.question_options o where o.question_id = new.id and o.is_correct
  ) <> 1 then
    raise exception 'Question % needs exactly one correct option before publishing', new.id
      using errcode = '23514';
  end if;
  return new;
end;
$$;
create constraint trigger questions_publishable
  after insert or update on public.questions
  deferrable initially deferred
  for each row execute function public.check_question_publishable();

-- ---------------------------------------------------------------------------
-- Revision cards
-- ---------------------------------------------------------------------------

create table public.revision_cards (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics (id) on delete cascade,
  kind public.revision_card_kind not null,
  position smallint not null default 1,
  front text not null,
  back text not null,
  data jsonb,
  status public.content_status not null default 'draft',
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index revision_cards_topic_idx on public.revision_cards (topic_id, position);
create trigger revision_cards_updated_at before update on public.revision_cards
  for each row execute function public.set_updated_at();

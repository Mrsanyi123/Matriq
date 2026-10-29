-- Matriq foundation: enum types and shared helpers.
-- Enum values mirror packages/types/src/index.ts (checked by supabase/tests).

create type public.interface_language as enum ('en', 'am', 'om');
create type public.study_stream as enum ('natural_science', 'social_science');
create type public.target_exam as enum ('euee', 'school_exams', 'general_study');
create type public.explanation_style as enum ('simple', 'step_by_step', 'exam_focused');
create type public.app_role as enum ('student', 'reviewer', 'editor', 'admin');
create type public.content_status as enum ('draft', 'in_review', 'approved', 'published', 'archived');
create type public.question_origin as enum ('official_past_exam', 'original_practice', 'ai_generated');
create type public.question_type as enum ('multiple_choice');
create type public.practice_mode as enum (
  'chapter', 'subject', 'exam_year', 'mixed', 'mock_exam', 'incorrect_review', 'saved'
);
create type public.lesson_kind as enum ('full', 'quick_notes');
create type public.lesson_section_kind as enum ('text', 'key_point', 'worked_example', 'formula', 'diagram');
create type public.revision_card_kind as enum (
  'concept', 'formula', 'worked_example', 'true_false', 'flashcard', 'multiple_choice'
);
create type public.bookmark_target as enum ('question', 'video', 'topic', 'revision_card', 'lesson');
create type public.xp_reason as enum (
  'correct_answer', 'lesson_read', 'chapter_completed', 'revision_success', 'daily_goal_met', 'achievement'
);
create type public.source_kind as enum (
  'original', 'textbook', 'past_exam_paper', 'video_channel', 'open_resource', 'other'
);
create type public.permission_status as enum (
  'unknown', 'requested', 'granted', 'licensed', 'public_domain', 'denied'
);
create type public.import_job_kind as enum ('exam_paper_pdf', 'curriculum', 'video_discovery');
create type public.import_job_status as enum (
  'queued', 'running', 'needs_review', 'completed', 'failed', 'cancelled'
);
create type public.review_item_status as enum ('pending', 'approved', 'rejected', 'changes_requested');
create type public.ai_conversation_mode as enum ('general', 'chapter', 'explain_question', 'hint', 'quiz');
create type public.ai_message_role as enum ('user', 'assistant', 'system');

-- Keeps updated_at current on every UPDATE.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- True if tz is a time zone name PostgreSQL knows (e.g. 'Africa/Addis_Ababa').
create function public.is_valid_time_zone(tz text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (select 1 from pg_catalog.pg_timezone_names where name = tz)
$$;

-- Slugs: lowercase words separated by single dashes.
create domain public.slug as text
  check (value ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(value) <= 80);

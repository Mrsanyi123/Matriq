-- Private per-student data. Rows are written by SECURITY DEFINER functions
-- (see 20261029000700_learning_functions.sql) so rewards cannot be forged.

create table public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  mode public.practice_mode not null,
  topic_id uuid references public.topics (id) on delete set null,
  subject_id uuid references public.subjects (id) on delete set null,
  exam_year smallint,
  question_ids uuid[] not null,
  time_limit_seconds integer check (time_limit_seconds > 0),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  correct_count smallint,
  total_count smallint
);
create index practice_sessions_user_idx on public.practice_sessions (user_id, started_at desc);

create table public.question_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  session_id uuid references public.practice_sessions (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  selected_option_id uuid not null references public.question_options (id) on delete cascade,
  is_correct boolean not null,
  time_spent_ms integer check (time_spent_ms between 0 and 3600000),
  created_at timestamptz not null default now()
);
create index question_attempts_user_idx on public.question_attempts (user_id, created_at desc);
create index question_attempts_user_question_idx on public.question_attempts (user_id, question_id);
create index question_attempts_session_idx on public.question_attempts (session_id, created_at);

-- Per-chapter progress. Status is derived (see @matriq/core deriveChapterStatus).
create table public.student_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  topic_id uuid not null references public.topics (id) on delete cascade,
  lesson_read_at timestamptz,
  first_practised_at timestamptz,
  completed_at timestamptz,
  best_score smallint check (best_score between 0 and 100),
  updated_at timestamptz not null default now(),
  primary key (user_id, topic_id)
);
create index student_progress_topic_idx on public.student_progress (topic_id);

-- Active study time, reported by the apps in chunks of at most 30 minutes.
create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  topic_id uuid references public.topics (id) on delete set null,
  activity_date date not null,
  seconds integer not null check (seconds between 1 and 1800),
  created_at timestamptz not null default now()
);
create index study_sessions_user_date_idx on public.study_sessions (user_id, activity_date);

-- One row per day with meaningful study activity, in the student's local
-- time zone. Streaks are computed from these dates.
create table public.daily_activity (
  user_id uuid not null references public.profiles (id) on delete cascade,
  activity_date date not null,
  xp integer not null default 0 check (xp >= 0),
  questions_answered integer not null default 0 check (questions_answered >= 0),
  study_seconds integer not null default 0 check (study_seconds >= 0),
  primary key (user_id, activity_date)
);

-- XP ledger. The unique key makes every award idempotent (e.g. a question's
-- first correct answer can only ever earn XP once).
create table public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  reason public.xp_reason not null,
  ref_key text not null,
  amount integer not null check (amount >= 0),
  activity_date date not null,
  created_at timestamptz not null default now(),
  unique (user_id, reason, ref_key)
);

create table public.revision_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  card_id uuid not null references public.revision_cards (id) on delete cascade,
  -- 1 = again, 2 = hard, 3 = good, 4 = easy
  rating smallint not null check (rating between 1 and 4),
  ease numeric(4, 2) not null default 2.5 check (ease between 1.3 and 5),
  interval_days integer not null default 0 check (interval_days >= 0),
  due_at timestamptz not null,
  reviewed_at timestamptz not null default now()
);
create index revision_reviews_user_due_idx on public.revision_reviews (user_id, due_at);
create index revision_reviews_card_idx on public.revision_reviews (card_id);

create table public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  target_type public.bookmark_target not null,
  target_id uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, target_type, target_id)
);

create table public.study_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 60),
  subject_id uuid references public.subjects (id) on delete set null,
  days_of_week smallint[] not null check (
    cardinality(days_of_week) between 1 and 7 and days_of_week <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]
  ),
  local_time time not null,
  time_zone text not null default 'Africa/Addis_Ababa',
  enabled boolean not null default true,
  snoozed_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index study_reminders_user_idx on public.study_reminders (user_id);
create trigger study_reminders_updated_at before update on public.study_reminders
  for each row execute function public.set_updated_at();

create function public.validate_reminder()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not public.is_valid_time_zone(new.time_zone) then
    raise exception 'Unknown time zone: %', new.time_zone using errcode = '22023';
  end if;
  if (select count(*) from public.study_reminders where user_id = new.user_id and id <> new.id) >= 20 then
    raise exception 'Too many reminders' using errcode = '54000';
  end if;
  return new;
end;
$$;
create trigger study_reminders_validate before insert or update on public.study_reminders
  for each row execute function public.validate_reminder();

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  slug public.slug not null unique,
  title text not null,
  description text not null,
  icon_key text not null,
  metric text not null check (metric in ('chapters_completed', 'streak_days', 'correct_answers')),
  threshold integer not null check (threshold > 0),
  created_at timestamptz not null default now()
);

create table public.student_achievements (
  user_id uuid not null references public.profiles (id) on delete cascade,
  achievement_id uuid not null references public.achievements (id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

-- ---------------------------------------------------------------------------
-- AI tutor (Phase 4). Written by server-side code only.
-- ---------------------------------------------------------------------------

create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  mode public.ai_conversation_mode not null,
  topic_id uuid references public.topics (id) on delete set null,
  question_id uuid references public.questions (id) on delete set null,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ai_conversations_user_idx on public.ai_conversations (user_id, updated_at desc);
create trigger ai_conversations_updated_at before update on public.ai_conversations
  for each row execute function public.set_updated_at();

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.ai_message_role not null,
  content text not null,
  -- Retrieved curriculum references shown to the student.
  sources jsonb not null default '[]'::jsonb,
  model text,
  input_tokens integer check (input_tokens >= 0),
  output_tokens integer check (output_tokens >= 0),
  created_at timestamptz not null default now()
);
create index ai_messages_conversation_idx on public.ai_messages (conversation_id, created_at);
create index ai_messages_user_day_idx on public.ai_messages (user_id, created_at);

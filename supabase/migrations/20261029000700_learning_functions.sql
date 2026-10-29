-- Learning RPCs called by @matriq/api-client (createSupabaseApi).
--
-- * Read functions are SECURITY INVOKER: Row Level Security applies.
-- * Write functions are SECURITY DEFINER with explicit ownership and
--   publication checks, because students have no direct write access to
--   progress, attempts, XP or achievements.
-- * Internal helpers live in the `private` schema, which the API roles cannot
--   reach.
-- JSON keys are camelCase to match @matriq/validation.

create schema if not exists private;
revoke all on schema private from public;

-- Mirrors XP_RULES in packages/core/src/gamification.ts (checked by tests).
create function public.xp_for_reason(reason public.xp_reason)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case reason
    when 'correct_answer' then 10
    when 'lesson_read' then 10
    when 'chapter_completed' then 50
    when 'revision_success' then 5
    when 'daily_goal_met' then 20
    else 0
  end
$$;

-- ---------------------------------------------------------------------------
-- Private helpers
-- ---------------------------------------------------------------------------

create function private.require_user()
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  return uid;
end;
$$;

create function private.student_time_zone(uid uuid)
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (select time_zone from public.student_preferences where user_id = uid),
    'Africa/Addis_Ababa'
  )
$$;

create function private.student_today(uid uuid)
returns date
language sql
stable
set search_path = ''
as $$ select (now() at time zone private.student_time_zone(uid))::date $$;

create function private.touch_activity(
  uid uuid, day date, add_xp integer default 0, add_questions integer default 0, add_seconds integer default 0
)
returns void
language sql
set search_path = ''
as $$
  insert into public.daily_activity (user_id, activity_date, xp, questions_answered, study_seconds)
  values (uid, day, add_xp, add_questions, add_seconds)
  on conflict (user_id, activity_date) do update set
    xp = public.daily_activity.xp + excluded.xp,
    questions_answered = public.daily_activity.questions_answered + excluded.questions_answered,
    study_seconds = public.daily_activity.study_seconds + excluded.study_seconds
$$;

-- Idempotent XP award; returns the amount actually granted (0 if already given).
create function private.award_xp(uid uuid, p_reason public.xp_reason, p_ref_key text)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_amount integer := public.xp_for_reason(p_reason);
  day date := private.student_today(uid);
  inserted integer;
begin
  if v_amount <= 0 then
    return 0;
  end if;
  insert into public.xp_events (user_id, reason, ref_key, amount, activity_date)
  values (uid, p_reason, p_ref_key, v_amount, day)
  on conflict on constraint xp_events_user_id_reason_ref_key_key do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then
    return 0;
  end if;
  perform private.touch_activity(uid, day, v_amount);
  return v_amount;
end;
$$;

-- Consecutive active days ending today (or yesterday if today is not active
-- yet). Mirrors computeStreak in @matriq/core.
create function private.streak_days(uid uuid)
returns integer
language sql
stable
set search_path = ''
as $$
  with recursive
    today as (select private.student_today(uid) as d),
    start as (
      select case
        when exists (select 1 from public.daily_activity a where a.user_id = uid and a.activity_date = today.d)
          then today.d
        else today.d - 1
      end as d
      from today
    ),
    walk (d, n) as (
      select s.d, 1 from start s
      where exists (select 1 from public.daily_activity a where a.user_id = uid and a.activity_date = s.d)
      union all
      select w.d - 1, w.n + 1 from walk w
      where exists (select 1 from public.daily_activity a where a.user_id = uid and a.activity_date = w.d - 1)
    )
  select coalesce(max(n), 0) from walk
$$;

create function private.evaluate_achievements(uid uuid)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  chapters integer;
  streak integer;
  correct integer;
  result jsonb;
begin
  select count(*) into chapters from public.student_progress where user_id = uid and completed_at is not null;
  streak := private.streak_days(uid);
  select count(*) into correct from public.question_attempts where user_id = uid and is_correct;

  with earned as (
    insert into public.student_achievements (user_id, achievement_id)
    select uid, a.id
    from public.achievements a
    where case a.metric
            when 'chapters_completed' then chapters
            when 'streak_days' then streak
            else correct
          end >= a.threshold
    on conflict do nothing
    returning achievement_id, earned_at
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'slug', a.slug, 'title', a.title, 'description', a.description, 'iconKey', a.icon_key,
      'earned', true, 'earnedAt', e.earned_at
    ) order by a.slug), '[]'::jsonb)
  into result
  from earned e join public.achievements a on a.id = e.achievement_id;
  return result;
end;
$$;

-- Chapters (top-level topics) of an edition with their 1-based number.
create function private.edition_chapters(p_edition_id uuid)
returns table (topic_id uuid, number integer)
language sql
stable
set search_path = ''
as $$
  select t.id, (row_number() over (order by u.position, t.position))::integer
  from public.topics t
  join public.units u on u.id = t.unit_id
  where u.edition_id = p_edition_id and t.parent_topic_id is null
    and t.status = 'published' and u.status = 'published'
$$;

create function private.published_topic(p_topic_id uuid)
returns table (id uuid, slug text, title text, edition_id uuid)
language plpgsql
stable
set search_path = ''
as $$
begin
  return query
  select t.id, t.slug::text, t.title, u.edition_id
  from public.topics t
  join public.units u on u.id = t.unit_id
  join public.curriculum_editions e on e.id = u.edition_id
  where t.id = p_topic_id and t.status = 'published' and u.status = 'published' and e.status = 'published';
  if not found then
    raise exception 'Chapter not found' using errcode = 'P0002';
  end if;
end;
$$;

-- Simple per-user rate limit on a counted table.
create function private.enforce_rate(label text, recent integer, max_allowed integer)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if recent >= max_allowed then
    raise exception 'Too many requests (%). Please slow down.', label using errcode = '54000';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Reads (SECURITY INVOKER: RLS applies)
-- ---------------------------------------------------------------------------

create function public.get_onboarding_options()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'gradeLevels', (select coalesce(jsonb_agg(level order by level), '[]'::jsonb) from public.grades),
    'streams', (select coalesce(jsonb_agg(jsonb_build_object('slug', slug, 'name', name) order by slug), '[]'::jsonb) from public.streams),
    'subjects', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'slug', s.slug,
        'name', s.name,
        'iconKey', s.icon_key,
        'gradeLevels', coalesce((
          select jsonb_agg(distinct g.level) from public.subject_offerings o
          join public.grades g on g.id = o.grade_id where o.subject_id = s.id), '[]'::jsonb),
        'streams', coalesce((
          select jsonb_agg(distinct o.stream) from public.subject_offerings o
          where o.subject_id = s.id and o.stream is not null), '[]'::jsonb),
        'hasContent', exists (
          select 1 from public.curriculum_editions e
          join public.units u on u.edition_id = e.id
          join public.topics t on t.unit_id = u.id
          where e.subject_id = s.id and e.status = 'published' and t.status = 'published')
      ) order by s.position, s.name), '[]'::jsonb)
      from public.subjects s
    ),
    'targetExams', jsonb_build_array(
      jsonb_build_object('slug', 'euee', 'name', 'University entrance exam (EUEE)'),
      jsonb_build_object('slug', 'school_exams', 'name', 'School exams'),
      jsonb_build_object('slug', 'general_study', 'name', 'General study')
    )
  )
$$;

create function public.get_my_account()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'profile', jsonb_build_object(
      'id', p.id,
      'displayName', p.display_name,
      'role', coalesce((
        select r.role::text from public.user_roles r where r.user_id = p.id
        order by array_position(array['admin', 'editor', 'reviewer']::text[], r.role::text) limit 1
      ), 'student'),
      'isAnonymous', coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false),
      'onboarded', p.onboarded_at is not null,
      'gradeLevel', g.level,
      'stream', p.stream
    ),
    'preferences', jsonb_build_object(
      'interfaceLanguage', sp.interface_language,
      'dailyGoalMinutes', sp.daily_goal_minutes,
      'targetExam', sp.target_exam,
      'explanationStyle', sp.explanation_style,
      'timeZone', sp.time_zone,
      'subjectSlugs', coalesce((
        select jsonb_agg(s.slug order by s.position, s.name) from public.student_subjects ss
        join public.subjects s on s.id = ss.subject_id where ss.user_id = p.id), '[]'::jsonb),
      'activeSubjectSlug', (select s.slug from public.subjects s where s.id = sp.active_subject_id)
    )
  )
  from public.profiles p
  join public.student_preferences sp on sp.user_id = p.id
  left join public.grades g on g.id = p.grade_id
  where p.id = auth.uid()
$$;

-- Everything the dashboard, learning path and progress screens need, in one
-- round trip. The client assembles it with @matriq/core.
create function public.get_learner_facts(p_subject_slug text default null)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  account jsonb;
  prof record;
  tz text;
  today date;
  subj record;
  v_edition_id uuid;
  v_edition_name text;
  v_edition_is_demo boolean;
  chapters jsonb := '[]'::jsonb;
  accuracy jsonb := '{}'::jsonb;
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;

  account := public.get_my_account();
  if account is null then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;
  select p.grade_id, p.stream into prof from public.profiles p where p.id = uid;
  select sp.time_zone into tz from public.student_preferences sp where sp.user_id = uid;
  today := (now() at time zone coalesce(tz, 'Africa/Addis_Ababa'))::date;

  select s.id, s.slug, s.name, s.icon_key into subj
  from public.subjects s
  where s.slug = coalesce(p_subject_slug, account -> 'preferences' ->> 'activeSubjectSlug');

  if subj.id is not null and prof.grade_id is not null then
    -- Prefer an edition for the student's stream, then a common one.
    select e.id, e.name, e.is_demo into v_edition_id, v_edition_name, v_edition_is_demo
    from public.curriculum_editions e
    where e.subject_id = subj.id and e.grade_id = prof.grade_id and e.is_current
      and e.status = 'published' and (e.stream is null or e.stream = prof.stream)
    order by (e.stream is null)
    limit 1;
  end if;

  if v_edition_id is not null then
    with ordered as (
      select t.id, t.slug, t.title, t.tagline, u.title as unit_title,
        row_number() over (order by u.position, t.position) as number
      from public.topics t
      join public.units u on u.id = t.unit_id
      where u.edition_id = v_edition_id and t.parent_topic_id is null
        and t.status = 'published' and u.status = 'published'
    )
    select coalesce(jsonb_agg(jsonb_build_object(
        'id', o.id, 'slug', o.slug, 'number', o.number, 'title', o.title, 'tagline', o.tagline,
        'unitTitle', o.unit_title,
        'lessonRead', sp.lesson_read_at is not null,
        'practised', sp.first_practised_at is not null,
        'completed', sp.completed_at is not null,
        'bestScore', sp.best_score,
        'questionCount', (
          select count(*) from public.question_topic_links l
          join public.questions q on q.id = l.question_id
          where l.topic_id = o.id and q.status = 'published')
      ) order by o.number), '[]'::jsonb)
    into chapters
    from ordered o
    left join public.student_progress sp on sp.topic_id = o.id and sp.user_id = uid;

    select coalesce(jsonb_object_agg(x.topic_id, jsonb_build_object('attempts', x.attempts, 'correct', x.correct)), '{}'::jsonb)
    into accuracy
    from (
      select l.topic_id, count(*) as attempts, count(*) filter (where a.is_correct) as correct
      from public.question_attempts a
      join public.question_topic_links l on l.question_id = a.question_id and l.is_primary
      where a.user_id = uid
      group by l.topic_id
    ) x;
  end if;

  return jsonb_build_object(
    'profile', account -> 'profile',
    'preferences', account -> 'preferences',
    'subject', case when subj.id is null then null
      else jsonb_build_object('slug', subj.slug, 'name', subj.name, 'iconKey', subj.icon_key) end,
    'course', case when v_edition_id is null then null
      else jsonb_build_object('editionName', v_edition_name, 'isDemo', v_edition_is_demo) end,
    'chapters', chapters,
    'today', today,
    'activeDates', coalesce((
      select jsonb_agg(a.activity_date order by a.activity_date) from public.daily_activity a
      where a.user_id = uid and a.activity_date > today - 400), '[]'::jsonb),
    'todayStudySeconds', coalesce((
      select sum(s.seconds) from public.study_sessions s where s.user_id = uid and s.activity_date = today), 0),
    'xpTotal', coalesce((select sum(x.amount) from public.xp_events x where x.user_id = uid), 0),
    'questionsAnswered', (select count(*) from public.question_attempts a where a.user_id = uid),
    'correctAnswers', (select count(*) from public.question_attempts a where a.user_id = uid and a.is_correct),
    'chapterAccuracy', accuracy,
    'reminders', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id, 'title', r.title,
        'subjectSlug', (select s.slug from public.subjects s where s.id = r.subject_id),
        'daysOfWeek', to_jsonb(r.days_of_week), 'localTime', to_char(r.local_time, 'HH24:MI'),
        'timeZone', r.time_zone, 'enabled', r.enabled and (r.snoozed_until is null or r.snoozed_until < now())
      ) order by r.created_at) from public.study_reminders r where r.user_id = uid), '[]'::jsonb),
    'earnedAchievements', coalesce((
      select jsonb_object_agg(a.slug, sa.earned_at) from public.student_achievements sa
      join public.achievements a on a.id = sa.achievement_id where sa.user_id = uid), '{}'::jsonb),
    'achievementCatalog', coalesce((
      select jsonb_agg(jsonb_build_object('slug', a.slug, 'title', a.title, 'description', a.description,
        'iconKey', a.icon_key) order by a.threshold, a.slug) from public.achievements a), '[]'::jsonb)
  );
end;
$$;

-- A published chapter with both lessons. Returns null when not visible.
create function public.get_chapter(p_slug text)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  t record;
  ordered jsonb;
  pos integer;
begin
  select tp.id, tp.slug, tp.title, tp.tagline, tp.learning_objectives, tp.is_demo, u.title as unit_title,
         u.edition_id, s.slug as subject_slug
  into t
  from public.topics tp
  join public.units u on u.id = tp.unit_id
  join public.curriculum_editions e on e.id = u.edition_id
  join public.subjects s on s.id = e.subject_id
  where tp.slug = p_slug and tp.parent_topic_id is null and tp.status = 'published'
    and u.status = 'published' and e.status = 'published';
  if not found then
    return null;
  end if;

  select jsonb_agg(jsonb_build_object('slug', x.slug, 'number', x.number, 'title', x.title, 'id', x.id) order by x.number)
  into ordered
  from (
    select tp.id, tp.slug, tp.title, row_number() over (order by u.position, tp.position) as number
    from public.topics tp join public.units u on u.id = tp.unit_id
    where u.edition_id = t.edition_id and tp.parent_topic_id is null
      and tp.status = 'published' and u.status = 'published'
  ) x;
  select i - 1 into pos from jsonb_array_elements(ordered) with ordinality as e(v, i) where v ->> 'id' = t.id::text;

  return jsonb_build_object(
    'id', t.id,
    'slug', t.slug,
    'number', pos + 1,
    'title', t.title,
    'tagline', t.tagline,
    'unitTitle', t.unit_title,
    'subjectSlug', t.subject_slug,
    'objectives', to_jsonb(t.learning_objectives),
    'fullLesson', coalesce((
      select jsonb_agg(jsonb_build_object('id', ls.id, 'kind', ls.kind, 'heading', ls.heading,
        'body', ls.body, 'data', ls.data) order by ls.position)
      from public.lessons l join public.lesson_sections ls on ls.lesson_id = l.id
      where l.topic_id = t.id and l.kind = 'full' and l.status = 'published'), '[]'::jsonb),
    'quickNotes', coalesce((
      select jsonb_agg(jsonb_build_object('id', ls.id, 'kind', ls.kind, 'heading', ls.heading,
        'body', ls.body, 'data', ls.data) order by ls.position)
      from public.lessons l join public.lesson_sections ls on ls.lesson_id = l.id
      where l.topic_id = t.id and l.kind = 'quick_notes' and l.status = 'published'), '[]'::jsonb),
    'progress', (
      select jsonb_build_object('lessonRead', sp.lesson_read_at is not null,
        'practised', sp.first_practised_at is not null, 'completed', sp.completed_at is not null)
      from public.student_progress sp where sp.user_id = uid and sp.topic_id = t.id),
    'questionCount', (
      select count(*) from public.question_topic_links l join public.questions q on q.id = l.question_id
      where l.topic_id = t.id and q.status = 'published'),
    'previous', case when pos > 0 then (ordered -> (pos - 1)) - 'id' else null end,
    'next', case when pos < jsonb_array_length(ordered) - 1 then (ordered -> (pos + 1)) - 'id' else null end,
    'isDemo', t.is_demo
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Writes (SECURITY DEFINER with explicit checks)
-- ---------------------------------------------------------------------------

create function public.complete_onboarding(
  p_grade_level smallint,
  p_stream public.study_stream,
  p_subject_slugs text[],
  p_target_exam public.target_exam,
  p_interface_language public.interface_language,
  p_daily_goal_minutes smallint,
  p_display_name text default null,
  p_time_zone text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  v_grade_id uuid;
  wanted integer := coalesce(cardinality(p_subject_slugs), 0);
  allowed integer;
begin
  select g.id into v_grade_id from public.grades g where g.level = p_grade_level;
  if v_grade_id is null then
    raise exception 'Unknown grade' using errcode = '22023';
  end if;
  if (p_grade_level >= 11) <> (p_stream is not null) then
    raise exception 'Stream is required in grades 11 and 12 only' using errcode = '22023';
  end if;
  if wanted = 0 or wanted > 12 then
    raise exception 'Choose between 1 and 12 subjects' using errcode = '22023';
  end if;

  select count(distinct s.id) into allowed
  from public.subjects s
  join public.subject_offerings o on o.subject_id = s.id and o.grade_id = v_grade_id
  where s.slug = any (p_subject_slugs)
    and (o.stream is null or p_stream is null or o.stream = p_stream);
  if allowed <> (select count(distinct x) from unnest(p_subject_slugs) x) then
    raise exception 'A chosen subject is not offered for this grade or stream' using errcode = '22023';
  end if;

  update public.profiles set
    grade_id = v_grade_id,
    stream = p_stream,
    display_name = coalesce(nullif(btrim(p_display_name), ''), display_name),
    onboarded_at = coalesce(onboarded_at, now())
  where id = uid;

  delete from public.student_subjects where user_id = uid;
  insert into public.student_subjects (user_id, subject_id)
  select uid, s.id from public.subjects s where s.slug = any (p_subject_slugs);

  update public.student_preferences set
    interface_language = p_interface_language,
    daily_goal_minutes = p_daily_goal_minutes,
    target_exam = p_target_exam,
    time_zone = coalesce(p_time_zone, time_zone),
    active_subject_id = (
      select s.id from public.subjects s where s.slug = any (p_subject_slugs)
      order by (s.slug = 'mathematics') desc, s.position limit 1
    )
  where user_id = uid;
end;
$$;

-- Patch keys: displayName, gradeLevel, stream.
create function public.update_my_profile(p_patch jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  new_grade smallint;
  new_stream public.study_stream;
begin
  select g.level, p.stream into new_grade, new_stream
  from public.profiles p left join public.grades g on g.id = p.grade_id where p.id = uid;

  if p_patch ? 'gradeLevel' then new_grade := (p_patch ->> 'gradeLevel')::smallint; end if;
  if p_patch ? 'stream' then new_stream := (p_patch ->> 'stream')::public.study_stream; end if;
  if new_grade is not null and (new_grade >= 11) <> (new_stream is not null) then
    raise exception 'Stream is required in grades 11 and 12 only' using errcode = '22023';
  end if;

  update public.profiles set
    display_name = case when p_patch ? 'displayName'
      then nullif(btrim(p_patch ->> 'displayName'), '') else display_name end,
    grade_id = case when p_patch ? 'gradeLevel'
      then (select g.id from public.grades g where g.level = new_grade) else grade_id end,
    stream = new_stream
  where id = uid;
end;
$$;

-- Patch keys: interfaceLanguage, dailyGoalMinutes, targetExam, explanationStyle,
-- timeZone, subjectSlugs, activeSubjectSlug.
create function public.update_my_preferences(p_patch jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  slugs text[];
begin
  update public.student_preferences set
    interface_language = coalesce((p_patch ->> 'interfaceLanguage')::public.interface_language, interface_language),
    daily_goal_minutes = coalesce((p_patch ->> 'dailyGoalMinutes')::smallint, daily_goal_minutes),
    target_exam = coalesce((p_patch ->> 'targetExam')::public.target_exam, target_exam),
    explanation_style = coalesce((p_patch ->> 'explanationStyle')::public.explanation_style, explanation_style),
    time_zone = coalesce(p_patch ->> 'timeZone', time_zone),
    active_subject_id = case when p_patch ? 'activeSubjectSlug'
      then (select s.id from public.subjects s where s.slug = p_patch ->> 'activeSubjectSlug')
      else active_subject_id end
  where user_id = uid;

  if p_patch ? 'subjectSlugs' then
    select array_agg(x) into slugs from jsonb_array_elements_text(p_patch -> 'subjectSlugs') x;
    if coalesce(cardinality(slugs), 0) = 0 then
      raise exception 'Choose at least one subject' using errcode = '22023';
    end if;
    delete from public.student_subjects where user_id = uid;
    insert into public.student_subjects (user_id, subject_id)
    select uid, s.id from public.subjects s where s.slug = any (slugs);
  end if;
end;
$$;

create function public.mark_lesson_read(p_topic_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  t record;
begin
  select * into t from private.published_topic(p_topic_id);
  insert into public.student_progress (user_id, topic_id, lesson_read_at)
  values (uid, p_topic_id, now())
  on conflict (user_id, topic_id) do update
    set lesson_read_at = coalesce(public.student_progress.lesson_read_at, now()), updated_at = now();
  perform private.touch_activity(uid, private.student_today(uid));
  return private.award_xp(uid, 'lesson_read', p_topic_id::text);
end;
$$;

create function public.start_chapter_practice(p_topic_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  t record;
  ids uuid[];
  session_id uuid;
  recent integer;
begin
  select * into t from private.published_topic(p_topic_id);
  select count(*) into recent from public.practice_sessions
  where user_id = uid and started_at > now() - interval '1 hour';
  perform private.enforce_rate('practice sessions', recent, 120);

  select array_agg(q.id order by l.position nulls last, q.created_at, q.id) into ids
  from public.question_topic_links l
  join public.questions q on q.id = l.question_id
  where l.topic_id = p_topic_id and q.status = 'published';
  if ids is null then
    raise exception 'This chapter has no practice questions yet' using errcode = 'P0002';
  end if;

  insert into public.practice_sessions (user_id, mode, topic_id, question_ids, total_count)
  values (uid, 'chapter', p_topic_id, ids, cardinality(ids))
  returning id into session_id;

  return jsonb_build_object(
    'sessionId', session_id,
    'chapter', jsonb_build_object(
      'id', t.id, 'slug', t.slug, 'title', t.title,
      'number', (select c.number from private.edition_chapters(t.edition_id) c where c.topic_id = t.id)
    ),
    'questions', (
      select jsonb_agg(jsonb_build_object(
        'id', q.id, 'prompt', q.prompt, 'hints', to_jsonb(q.hints), 'origin', q.origin,
        'examYear', (select p.exam_year from public.exam_papers p where p.id = q.exam_paper_id),
        'isDemo', q.is_demo,
        'options', (
          select jsonb_agg(jsonb_build_object('id', o.id, 'label', o.label, 'body', o.body) order by o.position)
          from public.question_options o where o.question_id = q.id)
      ) order by x.ord)
      from unnest(ids) with ordinality as x(id, ord)
      join public.questions q on q.id = x.id
    )
  );
end;
$$;

create function public.submit_question_attempt(
  p_session_id uuid, p_question_id uuid, p_option_id uuid, p_time_spent_ms integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  s record;
  chosen record;
  correct_id uuid;
  explanation text;
  recent integer;
  xp integer := 0;
  day date;
begin
  select * into s from public.practice_sessions where id = p_session_id and user_id = uid for update;
  if not found or s.completed_at is not null then
    raise exception 'Practice session is not active' using errcode = '55000';
  end if;
  if not (p_question_id = any (s.question_ids)) then
    raise exception 'Question is not part of this session' using errcode = '22023';
  end if;
  select id, is_correct into chosen from public.question_options
  where id = p_option_id and question_id = p_question_id;
  if not found then
    raise exception 'Option does not belong to this question' using errcode = '22023';
  end if;

  select count(*) into recent from public.question_attempts
  where user_id = uid and created_at > now() - interval '1 minute';
  perform private.enforce_rate('answers', recent, 60);

  select o.id into correct_id from public.question_options o where o.question_id = p_question_id and o.is_correct;
  select q.explanation into explanation from public.questions q where q.id = p_question_id;

  insert into public.question_attempts (user_id, session_id, question_id, selected_option_id, is_correct, time_spent_ms)
  values (uid, p_session_id, p_question_id, p_option_id, chosen.is_correct, p_time_spent_ms);

  if s.topic_id is not null then
    insert into public.student_progress (user_id, topic_id, first_practised_at)
    values (uid, s.topic_id, now())
    on conflict (user_id, topic_id) do update
      set first_practised_at = coalesce(public.student_progress.first_practised_at, now()), updated_at = now();
  end if;

  day := private.student_today(uid);
  perform private.touch_activity(uid, day, 0, 1, 0);
  if chosen.is_correct then
    xp := private.award_xp(uid, 'correct_answer', p_question_id::text);
  end if;

  return jsonb_build_object(
    'isCorrect', chosen.is_correct,
    'correctOptionId', correct_id,
    'explanation', coalesce(explanation, ''),
    'xpAwarded', xp
  );
end;
$$;

create function public.complete_practice_session(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  s record;
  correct integer;
  total integer;
  passed boolean;
  score integer;
  xp integer := 0;
  chapter_completed boolean := false;
  newly_completed integer;
begin
  select * into s from public.practice_sessions where id = p_session_id and user_id = uid for update;
  if not found then
    raise exception 'Practice session not found' using errcode = 'P0002';
  end if;
  if s.completed_at is not null then
    raise exception 'Session already completed' using errcode = '55000';
  end if;

  -- The first answer to each question decides the score.
  select count(*) filter (where first.is_correct) into correct
  from (
    select distinct on (a.question_id) a.is_correct
    from public.question_attempts a
    where a.session_id = p_session_id
    order by a.question_id, a.created_at, a.id
  ) first;
  total := cardinality(s.question_ids);
  passed := total > 0 and correct >= ceil(total * 2.0 / 3.0);
  score := case when total > 0 then round(correct * 100.0 / total) else 0 end;

  update public.practice_sessions
  set completed_at = now(), correct_count = correct, total_count = total
  where id = p_session_id;

  if s.topic_id is not null then
    insert into public.student_progress (user_id, topic_id, first_practised_at, best_score)
    values (uid, s.topic_id, now(), score)
    on conflict (user_id, topic_id) do update
      set best_score = greatest(coalesce(public.student_progress.best_score, 0), excluded.best_score),
          updated_at = now();

    if passed then
      update public.student_progress set completed_at = now()
      where user_id = uid and topic_id = s.topic_id and completed_at is null;
      get diagnostics newly_completed = row_count;
      if newly_completed > 0 then
        chapter_completed := true;
        xp := private.award_xp(uid, 'chapter_completed', s.topic_id::text);
      end if;
    end if;
  end if;

  return jsonb_build_object(
    'sessionId', p_session_id,
    'correct', correct,
    'total', total,
    'passed', passed,
    'xpAwarded', xp,
    'chapterCompleted', chapter_completed,
    'newAchievements', private.evaluate_achievements(uid)
  );
end;
$$;

create function public.record_study_time(p_seconds integer, p_topic_id uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  tz text := private.student_time_zone(uid);
  day date := private.student_today(uid);
  so_far integer;
  since_midnight integer;
  goal integer;
begin
  if p_seconds is null or p_seconds < 1 or p_seconds > 1800 then
    raise exception 'Study time must be between 1 and 1800 seconds' using errcode = '22023';
  end if;
  if p_topic_id is not null and not exists (select 1 from public.topics where id = p_topic_id) then
    raise exception 'Unknown chapter' using errcode = '22023';
  end if;

  -- Today's total can never exceed the time elapsed since local midnight.
  select coalesce(sum(seconds), 0) into so_far from public.study_sessions where user_id = uid and activity_date = day;
  since_midnight := extract(epoch from (now() at time zone tz) - day::timestamp)::integer + 60;
  if so_far + p_seconds > since_midnight then
    raise exception 'Study time exceeds the time elapsed today' using errcode = '22023';
  end if;

  insert into public.study_sessions (user_id, topic_id, activity_date, seconds)
  values (uid, p_topic_id, day, p_seconds);

  if p_seconds >= 60 then
    perform private.touch_activity(uid, day, 0, 0, p_seconds);
  elsif exists (select 1 from public.daily_activity where user_id = uid and activity_date = day) then
    perform private.touch_activity(uid, day, 0, 0, p_seconds);
  end if;

  select daily_goal_minutes * 60 into goal from public.student_preferences where user_id = uid;
  if so_far + p_seconds >= goal then
    perform private.award_xp(uid, 'daily_goal_met', day::text);
  end if;
  perform private.evaluate_achievements(uid);
end;
$$;

-- Permanently deletes the caller's account and, by cascade, all their data.
create function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
begin
  delete from auth.users where id = uid;
end;
$$;

grant execute on function public.get_onboarding_options() to anon, authenticated;
grant execute on function
  public.xp_for_reason(public.xp_reason),
  public.get_my_account(),
  public.get_learner_facts(text),
  public.get_chapter(text),
  public.complete_onboarding(smallint, public.study_stream, text[], public.target_exam, public.interface_language, smallint, text, text),
  public.update_my_profile(jsonb),
  public.update_my_preferences(jsonb),
  public.mark_lesson_read(uuid),
  public.start_chapter_practice(uuid),
  public.submit_question_attempt(uuid, uuid, uuid, integer),
  public.complete_practice_session(uuid),
  public.record_study_time(integer, uuid),
  public.delete_my_account(),
  public.is_valid_time_zone(text)
  to authenticated;

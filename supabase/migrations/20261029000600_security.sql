-- Row Level Security and privileges.
--
-- Approach: enable RLS everywhere, revoke every privilege from the API roles,
-- then grant back only what each table needs. Writes to progress, XP and
-- rewards happen exclusively through SECURITY DEFINER functions.
-- New tables in later migrations must follow the same pattern explicitly.

do $$
declare
  t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end
$$;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Reference data: readable by everyone, editable by content editors.
-- ---------------------------------------------------------------------------

grant select on public.grades, public.streams, public.subjects, public.subject_offerings, public.achievements
  to anon, authenticated;
grant insert, update, delete on public.subjects, public.subject_offerings to authenticated;

create policy "reference: read" on public.grades for select to anon, authenticated using (true);
create policy "reference: read" on public.streams for select to anon, authenticated using (true);
create policy "reference: read" on public.subjects for select to anon, authenticated using (true);
create policy "reference: read" on public.subject_offerings for select to anon, authenticated using (true);
create policy "reference: read" on public.achievements for select to anon, authenticated using (true);
create policy "editors: write" on public.subjects for all to authenticated
  using ((select public.can_edit_content())) with check ((select public.can_edit_content()));
create policy "editors: write" on public.subject_offerings for all to authenticated
  using ((select public.can_edit_content())) with check ((select public.can_edit_content()));

-- ---------------------------------------------------------------------------
-- Curriculum: published rows are public (cacheable); staff see drafts.
-- ---------------------------------------------------------------------------

grant select on public.curriculum_editions, public.units, public.topics, public.lessons, public.lesson_sections
  to anon, authenticated;
grant insert, update, delete on public.curriculum_editions, public.units, public.topics, public.lessons,
  public.lesson_sections, public.revision_cards, public.videos, public.video_topic_links,
  public.exam_papers, public.questions, public.question_options, public.question_topic_links,
  public.content_sources
  to authenticated;

create policy "published or staff: read" on public.curriculum_editions for select to anon, authenticated
  using (status = 'published' or (select public.is_staff()));
create policy "published or staff: read" on public.units for select to anon, authenticated
  using (status = 'published' or (select public.is_staff()));
create policy "published or staff: read" on public.topics for select to anon, authenticated
  using (status = 'published' or (select public.is_staff()));
create policy "published or staff: read" on public.lessons for select to anon, authenticated
  using (status = 'published' or (select public.is_staff()));
create policy "published lesson or staff: read" on public.lesson_sections for select to anon, authenticated
  using (
    (select public.is_staff())
    or exists (select 1 from public.lessons l where l.id = lesson_id and l.status = 'published')
  );

create policy "editors: write" on public.curriculum_editions for all to authenticated
  using ((select public.can_edit_content())) with check ((select public.can_edit_content()));
create policy "editors: write" on public.units for all to authenticated
  using ((select public.can_edit_content())) with check ((select public.can_edit_content()));
create policy "editors: write" on public.topics for all to authenticated
  using ((select public.can_edit_content())) with check ((select public.can_edit_content()));
create policy "editors: write" on public.lessons for all to authenticated
  using ((select public.can_edit_content())) with check ((select public.can_edit_content()));
create policy "editors: write" on public.lesson_sections for all to authenticated
  using ((select public.can_edit_content())) with check ((select public.can_edit_content()));

-- Revision cards and videos: signed-in students see published items.
grant select on public.revision_cards, public.videos, public.video_topic_links to authenticated;
create policy "published or staff: read" on public.revision_cards for select to authenticated
  using (status = 'published' or (select public.is_staff()));
create policy "editors: write" on public.revision_cards for all to authenticated
  using ((select public.can_edit_content())) with check ((select public.can_edit_content()));
create policy "published or staff: read" on public.videos for select to authenticated
  using (review_status = 'published' or (select public.is_staff()));
create policy "editors: write" on public.videos for all to authenticated
  using ((select public.can_edit_content())) with check ((select public.can_edit_content()));
create policy "published or staff: read" on public.video_topic_links for select to authenticated
  using (
    (select public.is_staff())
    or (status = 'published'
        and exists (select 1 from public.videos v where v.id = video_id and v.review_status = 'published'))
  );
create policy "editors: write" on public.video_topic_links for all to authenticated
  using ((select public.can_edit_content())) with check ((select public.can_edit_content()));

-- ---------------------------------------------------------------------------
-- Questions. Students may read published questions and options, but NOT the
-- correct answer or explanation: those columns are excluded from the grants
-- and revealed only by submit_question_attempt() after an answer.
-- Staff tooling reads them with the service role or definer functions.
-- ---------------------------------------------------------------------------

grant select (id, origin, type, prompt, hints, subject_id, grade_id, difficulty, exam_paper_id,
  source_page, source_question_number, image_paths, status, is_demo, created_at, updated_at)
  on public.questions to authenticated;
grant select (id, question_id, position, label, body) on public.question_options to authenticated;
grant select on public.question_topic_links, public.exam_papers to authenticated;

create policy "published or staff: read" on public.questions for select to authenticated
  using (status = 'published' or (select public.is_staff()));
create policy "editors: write" on public.questions for all to authenticated
  using ((select public.can_edit_content())) with check ((select public.can_edit_content()));
create policy "published question or staff: read" on public.question_options for select to authenticated
  using (
    (select public.is_staff())
    or exists (select 1 from public.questions q where q.id = question_id and q.status = 'published')
  );
create policy "editors: write" on public.question_options for all to authenticated
  using ((select public.can_edit_content())) with check ((select public.can_edit_content()));
create policy "published question or staff: read" on public.question_topic_links for select to authenticated
  using (
    (select public.is_staff())
    or exists (select 1 from public.questions q where q.id = question_id and q.status = 'published')
  );
create policy "editors: write" on public.question_topic_links for all to authenticated
  using ((select public.can_edit_content())) with check ((select public.can_edit_content()));
create policy "published or staff: read" on public.exam_papers for select to authenticated
  using (status = 'published' or (select public.is_staff()));
create policy "editors: write" on public.exam_papers for all to authenticated
  using ((select public.can_edit_content())) with check ((select public.can_edit_content()));

-- Sources carry licensing notes: staff only.
grant select on public.content_sources to authenticated;
create policy "staff: read" on public.content_sources for select to authenticated using ((select public.is_staff()));
create policy "editors: write" on public.content_sources for all to authenticated
  using ((select public.can_edit_content())) with check ((select public.can_edit_content()));

-- ---------------------------------------------------------------------------
-- Student identity
-- ---------------------------------------------------------------------------

grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;
create policy "self: read" on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy "self: update" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

grant select on public.user_roles to authenticated;
grant insert, delete on public.user_roles to authenticated;
create policy "self or admin: read" on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()) or (select public.has_role('admin')));
create policy "admin: grant" on public.user_roles for insert to authenticated
  with check ((select public.has_role('admin')));
create policy "admin: revoke" on public.user_roles for delete to authenticated
  using ((select public.has_role('admin')));

-- Preferences and subjects change through update_my_preferences() /
-- complete_onboarding(), which validate input; direct access is read-only.
grant select on public.student_preferences, public.student_subjects to authenticated;
create policy "self: read" on public.student_preferences for select to authenticated
  using (user_id = (select auth.uid()));
create policy "self: read" on public.student_subjects for select to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Learner activity: own rows only, read-only from the API.
-- ---------------------------------------------------------------------------

grant select on public.practice_sessions, public.question_attempts, public.student_progress,
  public.study_sessions, public.daily_activity, public.xp_events, public.student_achievements,
  public.revision_reviews, public.ai_conversations, public.ai_messages
  to authenticated;

create policy "self: read" on public.practice_sessions for select to authenticated
  using (user_id = (select auth.uid()));
create policy "self: read" on public.question_attempts for select to authenticated
  using (user_id = (select auth.uid()));
create policy "self: read" on public.student_progress for select to authenticated
  using (user_id = (select auth.uid()));
create policy "self: read" on public.study_sessions for select to authenticated
  using (user_id = (select auth.uid()));
create policy "self: read" on public.daily_activity for select to authenticated
  using (user_id = (select auth.uid()));
create policy "self: read" on public.xp_events for select to authenticated
  using (user_id = (select auth.uid()));
create policy "self: read" on public.student_achievements for select to authenticated
  using (user_id = (select auth.uid()));
create policy "self: read" on public.revision_reviews for select to authenticated
  using (user_id = (select auth.uid()));
create policy "self: read" on public.ai_conversations for select to authenticated
  using (user_id = (select auth.uid()));
create policy "self: read" on public.ai_messages for select to authenticated
  using (user_id = (select auth.uid()));

-- Bookmarks and reminders are plain student-owned data: full CRUD on own rows.
grant select, insert, delete on public.bookmarks to authenticated;
create policy "self: read" on public.bookmarks for select to authenticated
  using (user_id = (select auth.uid()));
create policy "self: create" on public.bookmarks for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "self: delete" on public.bookmarks for delete to authenticated
  using (user_id = (select auth.uid()));

grant select, delete on public.study_reminders to authenticated;
grant insert (title, subject_id, days_of_week, local_time, time_zone, enabled) on public.study_reminders
  to authenticated;
grant update (title, subject_id, days_of_week, local_time, time_zone, enabled, snoozed_until)
  on public.study_reminders to authenticated;
create policy "self: read" on public.study_reminders for select to authenticated
  using (user_id = (select auth.uid()));
create policy "self: create" on public.study_reminders for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "self: update" on public.study_reminders for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "self: delete" on public.study_reminders for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Content operations: staff only.
-- ---------------------------------------------------------------------------

grant select, insert, update on public.content_import_jobs, public.content_review_items to authenticated;
grant select on public.admin_audit_logs to authenticated;

create policy "staff: read" on public.content_import_jobs for select to authenticated using ((select public.is_staff()));
create policy "editors: write" on public.content_import_jobs for insert to authenticated
  with check ((select public.can_edit_content()));
create policy "editors: update" on public.content_import_jobs for update to authenticated
  using ((select public.can_edit_content())) with check ((select public.can_edit_content()));
create policy "staff: read" on public.content_review_items for select to authenticated using ((select public.is_staff()));
create policy "editors: create" on public.content_review_items for insert to authenticated
  with check ((select public.can_edit_content()));
create policy "reviewers: review" on public.content_review_items for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "admin: read" on public.admin_audit_logs for select to authenticated using ((select public.has_role('admin')));

-- Role helpers are needed by policies; everything else is granted per function.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.has_role(public.app_role), public.is_staff(), public.can_edit_content()
  to anon, authenticated;

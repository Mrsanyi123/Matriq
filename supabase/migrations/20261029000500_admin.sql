-- Content operations: import jobs, human review queue, audit log.

create table public.content_import_jobs (
  id uuid primary key default gen_random_uuid(),
  kind public.import_job_kind not null,
  source_id uuid references public.content_sources (id) on delete set null,
  status public.import_job_status not null default 'queued',
  -- Path in Supabase Storage (private bucket) for uploaded PDFs etc.
  storage_path text,
  params jsonb not null default '{}'::jsonb,
  stats jsonb not null default '{}'::jsonb,
  error text,
  created_by uuid references public.profiles (id) on delete set null,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index content_import_jobs_status_idx on public.content_import_jobs (status, created_at desc);
create trigger content_import_jobs_updated_at before update on public.content_import_jobs
  for each row execute function public.set_updated_at();

create table public.content_review_items (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.content_import_jobs (id) on delete set null,
  item_type text not null check (
    item_type in ('question', 'video_link', 'lesson', 'revision_card', 'topic_classification')
  ),
  item_id uuid not null,
  status public.review_item_status not null default 'pending',
  confidence numeric(4, 3) check (confidence between 0 and 1),
  -- Validation problems found automatically, e.g. [{"code":"missing_diagram"}].
  issues jsonb not null default '[]'::jsonb,
  -- Where the item came from (document, page, question number, API query…).
  provenance jsonb not null default '{}'::jsonb,
  assigned_to uuid references public.profiles (id) on delete set null,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index content_review_items_queue_idx on public.content_review_items (status, created_at);
create trigger content_review_items_updated_at before update on public.content_review_items
  for each row execute function public.set_updated_at();

create table public.admin_audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target_table text not null,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index admin_audit_logs_created_idx on public.admin_audit_logs (created_at desc);

-- Generic audit trigger for staff-edited tables.
create function public.audit_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_id text;
begin
  row_id := coalesce(to_jsonb(new) ->> 'id', to_jsonb(old) ->> 'id', to_jsonb(new) ->> 'user_id', to_jsonb(old) ->> 'user_id');
  insert into public.admin_audit_logs (actor_id, action, target_table, target_id, details)
  values (
    (select auth.uid()),
    lower(tg_op),
    tg_table_name,
    row_id,
    case tg_op
      when 'DELETE' then jsonb_build_object('old', to_jsonb(old))
      when 'INSERT' then jsonb_build_object('new', to_jsonb(new))
      else jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new))
    end
  );
  return coalesce(new, old);
end;
$$;

create trigger audit_user_roles after insert or update or delete on public.user_roles
  for each row execute function public.audit_change();
create trigger audit_questions after insert or update or delete on public.questions
  for each row execute function public.audit_change();
create trigger audit_videos after insert or update or delete on public.videos
  for each row execute function public.audit_change();
create trigger audit_exam_papers after insert or update or delete on public.exam_papers
  for each row execute function public.audit_change();
create trigger audit_content_sources after insert or update or delete on public.content_sources
  for each row execute function public.audit_change();
create trigger audit_review_items after update on public.content_review_items
  for each row execute function public.audit_change();
create trigger audit_topics after insert or update or delete on public.topics
  for each row execute function public.audit_change();

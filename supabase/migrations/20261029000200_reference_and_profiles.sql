-- Reference data tables (grades, streams, subjects) and student identity:
-- profiles, roles, preferences and chosen subjects.

create table public.grades (
  id uuid primary key default gen_random_uuid(),
  level smallint not null unique check (level between 1 and 12),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.streams (
  id uuid primary key default gen_random_uuid(),
  slug public.study_stream not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  slug public.slug not null unique,
  name text not null,
  icon_key text not null default 'book',
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger subjects_updated_at before update on public.subjects
  for each row execute function public.set_updated_at();

-- Which subjects are taught in which grade (and stream, for grades 11–12).
-- stream null = common to all streams.
create table public.subject_offerings (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects (id) on delete cascade,
  grade_id uuid not null references public.grades (id) on delete cascade,
  stream public.study_stream,
  created_at timestamptz not null default now(),
  unique nulls not distinct (subject_id, grade_id, stream)
);
create index subject_offerings_grade_idx on public.subject_offerings (grade_id);

-- One row per auth user. Collect as little personal data as possible: no
-- birth date, phone number or school is required.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(btrim(display_name)) between 1 and 40),
  grade_id uuid references public.grades (id),
  stream public.study_stream,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Staff roles live in their own table so students can never grant themselves
-- a role by editing their profile. No row = ordinary student.
create table public.user_roles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.app_role not null check (role <> 'student'),
  granted_by uuid references public.profiles (id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table public.student_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  interface_language public.interface_language not null default 'en',
  daily_goal_minutes smallint not null default 20 check (daily_goal_minutes in (10, 20, 30, 45, 60)),
  target_exam public.target_exam not null default 'euee',
  explanation_style public.explanation_style not null default 'step_by_step',
  time_zone text not null default 'Africa/Addis_Ababa',
  active_subject_id uuid references public.subjects (id) on delete set null,
  notifications_enabled boolean not null default true,
  quiet_hours_start time,
  quiet_hours_end time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger student_preferences_updated_at before update on public.student_preferences
  for each row execute function public.set_updated_at();

create function public.validate_preferences()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not public.is_valid_time_zone(new.time_zone) then
    raise exception 'Unknown time zone: %', new.time_zone using errcode = '22023';
  end if;
  return new;
end;
$$;
create trigger student_preferences_validate before insert or update on public.student_preferences
  for each row execute function public.validate_preferences();

create table public.student_subjects (
  user_id uuid not null references public.profiles (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, subject_id)
);

-- Create a profile and default preferences whenever an auth user signs up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  insert into public.student_preferences (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Role helpers used by RLS policies. SECURITY DEFINER so policies can consult
-- user_roles without granting students read access to other users' roles.
create function public.has_role(required public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid())
      and (
        role = required
        or role = 'admin'
        or (required = 'reviewer' and role = 'editor')
      )
  )
$$;

create function public.is_staff()
returns boolean
language sql
stable
set search_path = ''
as $$ select public.has_role('reviewer') $$;

create function public.can_edit_content()
returns boolean
language sql
stable
set search_path = ''
as $$ select public.has_role('editor') $$;

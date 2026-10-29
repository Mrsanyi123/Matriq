# Database

Supabase PostgreSQL (15+; local config targets 17). Migrations:
`supabase/migrations/`. Demo seed: `supabase/seed/demo_curriculum.sql`
(generated). Tests: `supabase/tests/` (`pnpm db:test`).

## Migrations

| File | Contents |
| --- | --- |
| `…000100_foundation.sql` | Enum types (mirror `@matriq/types`), `set_updated_at()`, `is_valid_time_zone()`, `slug` domain |
| `…000200_reference_and_profiles.sql` | grades, streams, subjects, subject_offerings, profiles, user_roles, student_preferences, student_subjects; new-user trigger; role helpers |
| `…000300_curriculum_and_content.sql` | content_sources, curriculum_editions, units, topics, lessons, lesson_sections, videos, video_topic_links, exam_papers, questions, question_options, question_topic_links, revision_cards |
| `…000400_learner_activity.sql` | practice_sessions, question_attempts, student_progress, study_sessions, daily_activity, xp_events, revision_reviews, bookmarks, study_reminders, achievements, student_achievements, ai_conversations, ai_messages |
| `…000500_admin.sql` | content_import_jobs, content_review_items, admin_audit_logs + audit triggers |
| `…000600_security.sql` | RLS on every table, explicit grants, column-level answer protection |
| `…000700_learning_functions.sql` | RPCs used by the apps (see below) and `private` helpers |
| `…000800_reference_data.sql` | Grades, streams, subjects, offerings, achievements (generated) |

Migrations are append-only: change the schema with a **new** migration.

## Entity overview

```
grades ─┐                       content_sources ─┬─ curriculum_editions
streams ┼─ subject_offerings ─ subjects ─────────┘        │
        │                                                  units
        │                                                  │
profiles ─ user_roles                                     topics (chapters, sub-topics)
   │  └─ student_preferences, student_subjects             │  ├─ lessons ─ lesson_sections
   │                                                      │  ├─ revision_cards
   ├─ practice_sessions ─ question_attempts ─┐             │  ├─ video_topic_links ─ videos
   ├─ student_progress (per topic)           │             │  └─ question_topic_links ─┐
   ├─ study_sessions, daily_activity, xp_events             │                          │
   ├─ student_achievements ─ achievements    └──── questions ─ question_options       │
   ├─ revision_reviews, bookmarks, study_reminders       └─ exam_papers ─ content_sources
   └─ ai_conversations ─ ai_messages
content_import_jobs ─ content_review_items      admin_audit_logs
```

### Curriculum

`grade → stream (optional) → subject → curriculum_edition → unit → topic → lesson → lesson_section`.

- **Editions** model textbook versions/sources; one `is_current` edition per
  subject/grade/stream.
- **Topics** with `parent_topic_id IS NULL` are student-facing *chapters*.
  Chapter numbers are derived from unit and topic positions. Slugs are
  globally unique because they appear in URLs.
- Every content table has `status` (`draft → in_review → approved →
  published → archived`) and `is_demo`. Students only see `published`.

### Questions

- `origin`: `official_past_exam` | `original_practice` | `ai_generated`.
  Constraints enforce: official questions need an `exam_paper_id` and
  `source_question_number`, are never demo, and cannot be published unless
  `verified_at` is set; only official questions may reference an exam paper;
  AI questions must record `generated_by_model`.
- A question can only be published with **exactly one** correct option and an
  explanation (deferred constraint trigger).
- `exam_papers.source_id` is mandatory: every paper records its provenance.
- Designed for more types later (`question_type` enum, `question_options`
  separate table, `image_paths` for diagrams in Storage).

### Videos

Only YouTube metadata is stored (`youtube_video_id`, channel, thumbnail URL,
duration, language, embeddability, availability, review status, discovery and
refresh timestamps). `source_url` is generated from the ID. A video cannot be
`published` unless it is embeddable and available.

### Learner data

- `student_progress` (user × topic): `lesson_read_at`, `first_practised_at`,
  `completed_at`, `best_score`. Chapter *status* is derived in
  `@matriq/core` (`deriveChapterStatus`).
- `daily_activity`: one row per local day with meaningful activity; streaks are
  computed from it in the student's time zone.
- `xp_events`: XP ledger with `unique (user_id, reason, ref_key)` so each
  award (first correct answer per question, chapter completion, daily goal per
  date…) happens once.
- `study_sessions`: active study time reported by apps (≤30 min per row); the
  day's total cannot exceed the time elapsed since local midnight.

## Security model

| Data | anon | student (own rows) | student (others) | reviewer | editor/admin |
| --- | --- | --- | --- | --- | --- |
| Reference data | read | read | — | read | write |
| Published curriculum | read | read | — | read all | write |
| Published questions/options | — | read (no answers) | — | read all | write |
| `is_correct`, `explanation` | — | **never directly** | — | via service/RPC | via service/RPC |
| Content sources | — | — | — | read | write |
| Profile | — | read, update name | — | — | — |
| Preferences/subjects | — | read (write via RPC) | — | — | — |
| Progress, attempts, XP, streaks, achievements | — | read (write via RPC) | — | — | — |
| Reminders, bookmarks | — | full CRUD | — | — | — |
| AI conversations | — | read | — | — | — |
| Import jobs, review queue | — | — | — | read/review | write |
| Audit log | — | — | — | — | admin read |

Implementation notes:

- `revoke all` from `anon`/`authenticated`, then explicit grants. RLS enabled
  on every table. **New tables must do the same.**
- Staff roles live in `user_roles` (not `profiles`) so students can't edit
  them. `has_role()` is `SECURITY DEFINER`; admin includes editor includes
  reviewer.
- Write RPCs are `SECURITY DEFINER` with `set search_path = ''`, explicit
  ownership checks, publication checks and simple rate limits
  (120 practice sessions/hour, 60 answers/minute).
- Read RPCs are `SECURITY INVOKER` so RLS applies.
- Helpers live in schema `private`, which is not exposed through the API.
- Audit triggers record changes to roles, questions, videos, exam papers,
  sources, topics and review decisions.

## RPC reference

| Function | Kind | Purpose |
| --- | --- | --- |
| `get_onboarding_options()` | invoker | Grades, streams, subjects (with offerings and content availability), exams |
| `get_my_account()` | invoker | Profile + preferences |
| `get_learner_facts(p_subject_slug)` | invoker | Everything for dashboard/path/progress in one call |
| `get_chapter(p_slug)` | invoker | Chapter with both lessons, prev/next, own progress; `null` if not visible |
| `complete_onboarding(…)` | definer | Validates grade/stream/subjects; sets profile, subjects, preferences |
| `update_my_profile(p_patch)` | definer | displayName, gradeLevel, stream (stream rule enforced) |
| `update_my_preferences(p_patch)` | definer | Language, goal, exam, style, time zone, subjects, active subject |
| `mark_lesson_read(p_topic_id)` | definer | Progress + `lesson_read` XP once |
| `start_chapter_practice(p_topic_id)` | definer | Creates a session; returns questions **without answers** |
| `submit_question_attempt(…)` | definer | Checks answer server-side; returns correctness, correct option, explanation, XP |
| `complete_practice_session(p_session_id)` | definer | Scores by first answers; completes chapter at ≥ ⅔; awards XP/achievements |
| `record_study_time(p_seconds, p_topic_id)` | definer | Study time, daily-goal XP |
| `delete_my_account()` | definer | Deletes the auth user; all data cascades |
| `xp_for_reason(reason)` | immutable | XP table (mirrors `@matriq/core` `XP_RULES`) |

Error codes (SQLSTATE → `MatriqApiError.code`): `42501` unauthorized,
`P0002` not_found, `22023`/`23514` validation, `55000` conflict, `54000`
rate_limited.

## Seed data

- `…000800_reference_data.sql` (migration): real reference data needed in
  every environment.
- `seed/demo_curriculum.sql` (local/preview only): the Grade 12 Mathematics
  pilot — 3 chapters, 6 lessons, 3 questions per chapter, 9 revision cards —
  all `is_demo = true`, origin `original_practice`, source "Matriq demo
  content". No official exam papers, textbook citations or YouTube IDs.

Both are generated from TypeScript (`pnpm --filter @matriq/db seed:generate`)
and a test fails if the committed SQL drifts from `@matriq/demo-content`.

## Testing

`supabase/tests` creates a throwaway database, applies a **test-only** shim of
Supabase's `auth` schema and API roles (`tests/support/supabase-shim.sql`),
all migrations and the seed, then runs:

- enum / XP / catalogue sync checks against `@matriq/types` and `@matriq/core`;
- RLS isolation between students, answer-column protection, blocked direct
  writes, role self-escalation, draft visibility;
- integrity constraints (provenance, AI model, publishable questions/videos);
- the **real `createSupabaseApi`** end-to-end through an adapter that executes
  its RPC calls as a signed-in user — onboarding, dashboard, chapter, practice,
  tampering attempts, study time, preferences, account deletion.

Run locally:

```bash
# any PostgreSQL 15+; default URL postgres://postgres@localhost:54329/postgres
MATRIQ_TEST_DATABASE_URL=postgres://postgres@localhost:5432/postgres pnpm db:test
```

Optional HTTP-level test (`tests/postgrest.test.ts`): runs the real
`createSupabaseApi` through **PostgREST** (the API server inside Supabase) with
`@supabase/postgrest-js` and self-signed JWTs — covers reminders via table
access, isolation and error mapping over HTTP. It runs only when
`MATRIQ_TEST_POSTGREST_URL`, `MATRIQ_TEST_JWT_SECRET` and
`MATRIQ_TEST_REST_DB_URL` are set (PostgREST pointed at a database prepared
with the shim, migrations and seed, connecting as an `authenticator` role
granted `anon` and `authenticated`).

Not covered (needs a full Supabase stack): Supabase Auth (GoTrue) email
delivery and code verification, Storage.

## Generating TypeScript types

When a Supabase project is linked, `supabase gen types typescript --linked >
packages/types/src/database.ts` can provide typed table access. The apps
don't depend on it today because all data passes through Zod-validated RPCs.

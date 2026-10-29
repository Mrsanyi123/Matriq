# Roadmap

Each phase must leave the product working end to end. Status reflects what is
in the repository and verified by tests, not intentions.

## Phase 1 — Foundation *(current)*

| Item | Status |
| --- | --- |
| Monorepo (pnpm + Turborepo), strict TS, shared packages | ✅ |
| Design system extracted from the prototype (`@matriq/ui`, DESIGN_SYSTEM.md, WCAG checks) | ✅ |
| Interface i18n en/am/om with prototype translations | ✅ (am/om new keys need native review) |
| Database schema for all planned features, RLS, RPCs, reference data, demo seed | ✅ tested on PostgreSQL 16 |
| `MatriqApi` contract; Supabase and on-device demo implementations | ✅ |
| Web app shell, auth (email code), onboarding, dashboard | see web report in README |
| Android app shell, auth, onboarding, dashboard | see mobile report in README |
| Prototype parity: learning path, lesson reader, chapter practice, results, progress, language switch | see app reports |

## Phase 2 — Core learning

- Curriculum browsing across subjects/grades as content arrives.
- Practice by subject and mixed revision (schema ready: `practice_mode`).
- Review incorrect answers; saved questions (`bookmarks`).
- Offline reading of recently opened lessons (TanStack Query persistence on mobile).
- Progress: time per subject, weak-topic list.

## Phase 3 — Content engine

- Admin app (separate protected route group / app) for curriculum, videos,
  questions, review queue, sources, users & permissions, audit log.
- YouTube discovery Edge Function (official Data API) → candidates →
  confidence scoring → review queue → publish; periodic availability refresh.
- Exam-paper import: PDF upload to private Storage → extraction →
  segmentation → topic matching → key comparison → draft explanations →
  human review. Only content with reproduction rights is published.
- See [CONTENT_PIPELINE.md](./CONTENT_PIPELINE.md).

## Phase 4 — AI tutor

- Provider-agnostic LLM service in an Edge Function; streaming; conversation
  persistence (`ai_conversations`, `ai_messages`); pgvector retrieval over
  approved content; per-student daily limits and cost tracking.
- Modes: general, ask about chapter, explain question, hint, quiz me.
- See [AI_TUTOR.md](./AI_TUTOR.md).

## Phase 5 — Engagement

- Swipeable revision cards with finite sessions and spaced repetition
  (`revision_cards`, `revision_reviews` ready).
- Study planner UI; local notifications on Android via `expo-notifications`;
  browser notifications only with explicit permission; quiet hours.
- More achievements; revision milestones.

## Phase 6 — Advanced

- Android home-screen widgets (requires a development build and a native
  widget module; not possible in Expo Go). In-app widget previews first.
- Timed mock exams (timer, navigation, submission, review).
- Recommendations from learning gaps; more subjects and grades.

## Open decisions (need the product owner)

1. **Supabase project** (region, plan) and production domain.
2. **Android package name** (placeholder `com.matriq.app`) and Play developer account.
3. **LLM provider** and monthly AI budget (Phase 4).
4. **Content rights**: which past EUEE papers and textbooks can legally be
   reproduced; agreements with the Ministry of Education / publishers.
5. **Legal review** for minors' data (Ethiopia's Personal Data Protection
   Proclamation and app-store child-safety policies) before launch.
6. **Native-speaker review** of Amharic and Afaan Oromoo strings, including
   gender-neutral phrasing.

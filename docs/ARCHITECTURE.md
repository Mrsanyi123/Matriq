# Architecture

## Overview

```
┌──────────────────────┐   ┌───────────────────────────┐
│ apps/web (Next.js)   │   │ apps/mobile (Expo / RN)   │
│ App Router, Tailwind │   │ Expo Router, StyleSheet   │
│ shadcn/Radix, Lucide │   │ lucide-react-native       │
└──────────┬───────────┘   └─────────────┬─────────────┘
           │   TanStack Query + MatriqApi │
           ▼                              ▼
┌─────────────────────────────────────────────────────┐
│ @matriq/api-client                                  │
│  MatriqApi interface ─┬─ createSupabaseApi(client)  │──► Supabase (Auth, Postgres+RLS,
│  query keys/options   └─ createDemoApi(storage)     │    RPCs, Storage, Edge Functions)
├─────────────────────────────────────────────────────┤
│ @matriq/core        pure rules: streaks, XP, path,  │
│                     dashboard assembly, reminders   │
│ @matriq/validation  Zod contracts (+ inferred types)│
│ @matriq/types       enum constants                  │
│ @matriq/i18n        en / am / om interface strings  │
│ @matriq/ui          design tokens + nav definitions │
│ @matriq/demo-content pilot curriculum (demo)        │
└─────────────────────────────────────────────────────┘
```

## Monorepo

- **pnpm workspaces + Turborepo.** `pnpm test`, `pnpm typecheck`,
  `pnpm build` run across all packages.
- **Internal packages ship TypeScript source** (`"main": "./src/index.ts"`),
  no build step. Next.js compiles them via `transpilePackages`; Metro compiles
  them natively.
- **No React in shared packages.** Shared code is plain TypeScript, so web
  (React 19.x via Next) and mobile (React version pinned by the Expo SDK) can
  never end up with duplicate or mismatched React copies. Query options are
  plain `{ queryKey, queryFn }` objects passed to each app's own `useQuery`.

### Package manager

`node-linker=hoisted` (`.npmrc`). React Native tooling (Metro, autolinking,
Gradle) is most reliable with a flat `node_modules`. pnpm still gives a strict
lockfile and fast installs.

### React version

Both apps pin **React 19.3.0** (the version Expo SDK 58 requires), enforced by
a root `pnpm.overrides`. With a hoisted `node_modules`, two React versions
cause "invalid hook call" failures in shared test tooling. Upgrade React in
both apps together, following the Expo SDK.

### TypeScript

Pinned to **TypeScript 6.0.x**. TypeScript 7 (native compiler) is available
but Next.js type-checking, Jest and lint tooling still depend on the JS
compiler API. Revisit when the ecosystem supports TS 7.

Strict mode plus `noUncheckedIndexedAccess` everywhere
(`packages/config/tsconfig.base.json`).

## Data access: one contract, two implementations

`MatriqApi` (`packages/api-client/src/api.ts`) is the only way apps read or
write learner data.

| | `createSupabaseApi(client)` | `createDemoApi(storage)` |
| --- | --- | --- |
| Who | Signed-in students | "Try the demo" guests, or builds without Supabase configured |
| Content | Published rows in Postgres | Bundled `@matriq/demo-content` |
| Progress | Postgres, isolated by RLS | Device storage (localStorage / AsyncStorage) |
| Answer checking | Server-side RPC; correct answers are not readable by students | Local (demo content is public sample material) |
| Labelled | — | Always shown as **Demo** in the UI |

Both implementations gather raw *facts* (chapter progress, activity dates,
attempt counts, reminders) and pass them to the same `@matriq/core` functions
(`buildDashboard`, `buildProgressSummary`, `continueStudying`, `recommend`).
The rules exist once. XP amounts are additionally enforced in SQL for real
accounts (`public.xp_for_reason`), and a database test asserts the SQL and
TypeScript values match.

The demo mode is a product feature (the "limited guest/demo experience"), not
a mock: it never pretends to be an account, and production code paths never
fall back to fake data silently. If Supabase is not configured, apps say so
and offer only the demo.

## Authentication

- **Supabase Auth, email one-time code** (`signInWithOtp` →
  `verifyOtp({ type: 'email' })`). Works identically on web and Android
  without deep-link setup, and students don't need to manage passwords.
  Additional providers (phone OTP, Google) can be enabled later in Supabase.
- **Web:** `@supabase/ssr` cookie sessions; `src/proxy.ts` (Next 16's name for
  middleware) refreshes the session and protects app routes.
- **Mobile:** `@supabase/supabase-js` with session persistence in
  `expo-secure-store` (chunked) or AsyncStorage, `detectSessionInUrl: false`.
- **Guest:** on-device demo (`createDemoApi`). A future option is Supabase
  anonymous sign-in so guests can upgrade without losing progress.
- After sign-in, a student with `profile.onboarded = false` is sent to
  onboarding.

### Environment variables

| Variable | Where | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | web | Public; RLS protects data |
| `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` | mobile | Public; RLS protects data |
| `SUPABASE_SERVICE_ROLE_KEY` | server/scripts only | Never in a client bundle |
| `YOUTUBE_API_KEY`, `LLM_API_KEY` | server/Edge Functions only | Phases 3–4 |

## Database

Supabase Postgres. Migrations in `supabase/migrations`, documented in
[DATABASE.md](./DATABASE.md). Key principles:

- **RLS on every table.** Students only ever see their own rows; curriculum is
  readable only when `status = 'published'`.
- **Answers are protected by column privileges.** Students cannot select
  `question_options.is_correct` or `questions.explanation`; they submit
  answers through `submit_question_attempt()` which checks server-side.
- **Rewards are server-authoritative.** XP, chapter completion and
  achievements are written only by `SECURITY DEFINER` functions, never by
  direct client inserts.
- **Demo content is flagged** (`is_demo`) and official past-exam questions
  are structurally separated from AI-generated practice (`origin` + check
  constraints).

## Web app

Next.js App Router. Server components for the shell and static content,
client components with TanStack Query for learner data (both modes go through
`MatriqApi`). Tailwind CSS with the `@matriq/ui` tokens as CSS variables,
shadcn/ui-style components built on Radix primitives, Lucide icons. Playwright
for end-to-end flows, Vitest + React Testing Library for components.

## Mobile app

Expo (managed workflow, development builds for native modules), Expo Router,
TypeScript. Styling via `StyleSheet` with `@matriq/ui` tokens (NativeWind was
considered; plain StyleSheet keeps one fewer build-time dependency and maps
1:1 to tokens). Fonts via `expo-font`/`@expo-google-fonts`. Jest (`jest-expo`)
+ React Native Testing Library. Target: Google Play (Android first).

## Offline

Phase 1: offline banner + clear "needs connection" states; demo mode works
fully offline. Later: cache recently opened lessons (TanStack Query
persistence on mobile), queue progress writes for sync.

## Decisions log

| # | Decision | Alternatives | Reason |
| --- | --- | --- | --- |
| 1 | Shared packages contain no React | Shared hooks package | Avoids React version conflicts between Next and Expo |
| 2 | Zod schemas are the API contract | Hand-written TS interfaces | Runtime validation + types from one source |
| 3 | Email OTP auth | Magic links, passwords | No deep links needed on Android; no passwords for teens |
| 4 | Demo mode = on-device implementation of the same interface | Mock server, Supabase anon users | Works offline, no backend needed to try the app, clearly separate |
| 5 | Answer correctness hidden via column privileges + RPC | Edge Function for checking | Fewer moving parts, enforced by Postgres |
| 6 | TypeScript 6.0 | TypeScript 7 native | Ecosystem compatibility |
| 7 | pgvector deferred to Phase 4 migration | Enable now | Not needed until AI retrieval; keeps Phase 1 migrations portable |
| 8 | Nunito + Noto Sans Ethiopic | System fonts | Consistent rounded look; correct Amharic rendering |
| 9 | Minor palette darkening | Keep prototype hex values | WCAG AA contrast (see DESIGN_SYSTEM.md) |

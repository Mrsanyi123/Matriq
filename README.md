# Matriq

Gamified, AI-assisted exam preparation for Ethiopian students preparing for
the University Entrance Examination (EUEE). Web (Next.js) and Android (Expo /
React Native) apps share one TypeScript core and a Supabase backend.

> Pilot content is **demo content** (Grade 12 Mathematics, three chapters),
> written for illustration — not official EUEE material.

## Repository

```
apps/
  web/            Next.js App Router student web app
  mobile/         Expo / React Native app (Android first)
packages/
  types/          Enum constants shared by DB, API and UI
  validation/     Zod API contracts (+ inferred types)
  core/           Pure business rules: streaks, XP, learning path, dashboard, reminders
  i18n/           Interface strings: English, Amharic, Afaan Oromoo
  ui/             Design tokens and navigation definitions
  demo-content/   Pilot curriculum (demo) and reference catalogue
  api-client/     MatriqApi contract, Supabase + on-device demo implementations, query factories
  config/         Shared tsconfig
supabase/         Migrations, generated seed, database tests, config
scripts/          Content pipeline entry points (Phase 3)
design-reference/ The original HTML prototype and screenshot
docs/             Vision, architecture, design system, database, pipeline, AI tutor, roadmap
```

Start with [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and
[docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md).

## Requirements

- Node.js 22+, pnpm 10 (`corepack enable`)
- For database tests: any PostgreSQL 15+ server
- For a full local backend: Supabase CLI + Docker (`supabase start`)

## Common commands

```bash
pnpm install
```

```bash
pnpm typecheck
```

```bash
pnpm test
```

```bash
pnpm build
```

`pnpm test` includes the database tests, which need PostgreSQL (default
`postgres://postgres@localhost:54329/postgres`; override with
`MATRIQ_TEST_DATABASE_URL`). See [docs/DATABASE.md](docs/DATABASE.md#testing).

## Backend setup

1. Create a Supabase project (or run `supabase start` locally).
2. Apply migrations: `supabase db push` (hosted) or they apply automatically
   on `supabase start`. Local starts also load the demo seed.
3. In Auth settings enable email sign-in with **6-digit codes** (template in
   `supabase/templates/sign-in-code.html`).
4. Copy the project URL and anon key into `apps/web/.env.local` and
   `apps/mobile/.env` (see each app's `.env.example`).

Without Supabase configured, both apps still run in **demo mode** (on-device
progress, bundled demo content) and say so in the UI.

## Phase status

See [docs/ROADMAP.md](docs/ROADMAP.md).

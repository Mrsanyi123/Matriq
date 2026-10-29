# Matriq web (`@matriq/web`)

Next.js 16 App Router student web app. Design: `docs/DESIGN_SYSTEM.md`;
data: `MatriqApi` from `@matriq/api-client` (Supabase or on-device demo).

## Run

```bash
cp apps/web/.env.example apps/web/.env.local   # optional: leave empty for demo-only
```

```bash
pnpm --filter @matriq/web dev
```

Open http://localhost:3000. Without Supabase values the welcome screen offers
only the demo.

## Structure

- `src/app/` — routes: `/welcome`, `/onboarding`, and the app shell group
  `(app)` with `/home`, `/learn`, `/learn/[slug]`, `/learn/[slug]/practice`,
  `/practice`, `/progress`, `/settings`, `/profile`, plus honest "coming soon"
  pages for `/revision`, `/library`, `/tutor`, `/planner`.
- `src/proxy.ts` — Next 16's renamed middleware: refreshes Supabase sessions,
  protects app routes, lets the `matriq_mode=demo` cookie through.
- `src/lib/api.tsx` — chooses `createSupabaseApi` (signed in) or
  `createDemoApi` (demo cookie) and exposes TanStack Query factories.
- `src/styles/tokens.css` — generated from `@matriq/ui` (`pnpm tokens`); a test
  fails if it drifts.
- `src/components/` — shell (sidebar, top bar, bottom tabs), learning path,
  lesson reader, practice, dashboard, Radix-based sheet/menu primitives.

## Checks

```bash
pnpm --filter @matriq/web typecheck
```

```bash
pnpm --filter @matriq/web test
```

```bash
pnpm --filter @matriq/web build
```

```bash
pnpm --filter @matriq/web test:e2e
```

`test:e2e` runs Playwright against `next start` in demo mode: the full
journey (welcome → demo → onboarding → dashboard → path → lesson → practice →
results → dashboard → Amharic) and a no-horizontal-scroll check at 375px.
`pnpm --filter @matriq/web screenshots` refreshes `screenshots/`.

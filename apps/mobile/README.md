# Matriq mobile (`@matriq/mobile`)

React Native + Expo app for Android (Google Play first). Expo SDK 58
(React Native 0.88, React 19.3), Expo Router, TypeScript strict, TanStack
Query, Supabase Auth. Styling is plain `StyleSheet` with tokens from
`@matriq/ui` (see `docs/DESIGN_SYSTEM.md`); the visual source of truth is
`design-reference/matriq-mobile.html`.

## Run it

```bash
pnpm install                      # from the repo root
cp apps/mobile/.env.example apps/mobile/.env   # optional, see below
pnpm --filter @matriq/mobile start             # Metro + QR code
```

- **Expo Go** (quickest): scan the QR code with Expo Go on an Android phone.
  Every native module the app uses (SecureStore, NetInfo, SVG, fonts, splash,
  safe area, screens) ships in Expo Go for SDK 58, so the app is expected to
  run there unchanged (not yet tried on a device from this repo).
- **Development build** (closest to the store app, needed once we add native
  code that Expo Go lacks, e.g. home-screen widgets in a later phase):
  ```bash
  npx eas-cli build --profile development --platform android   # installable APK
  pnpm --filter @matriq/mobile start                          # then open it in the dev build
  ```
  or, with a local Android SDK: `pnpm --filter @matriq/mobile android:native`.

### Environment

| Variable | Meaning |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Public Supabase project values. Without them the welcome screen says accounts are not configured and offers only the demo. |
| `MATRIQ_ANDROID_PACKAGE` | Optional override of the Android application ID. |

Never put the service-role key in the app. For EAS builds, set the two public
values as EAS environment variables (`eas env:create`) per profile.

## What is in the app

| Route | Screen |
| --- | --- |
| `/welcome` | Email one-time code (`signInWithOtp` → `verifyOtp`, `type: 'email'`) and "Try the demo without an account" (remembered on the device) |
| `/onboarding` | Grade → stream (11–12) → subjects → target exam → language → daily goal → optional name; validated with `OnboardingInputSchema` |
| `/` (tab Home) | Greeting, one Continue card, daily goal, quick actions (Practice, Ask AI, Quick revision, Browse videos), study activity, next reminder, ≤2 suggestions, demo notice |
| `/learn` (tab) | Winding learning path (SVG trail, node states), course switch → course sheet |
| `/practice` (tab) | Chapter list with Read / Practice |
| `/library` (tab) | Coming soon |
| `/profile` (tab) | Profile summary, links to Progress, Settings, language; sign out / exit demo |
| `/lesson/[slug]` | Full lesson / Quick notes, objectives, key notes, worked example, function plot, prev/next, Practice |
| `/session/[chapterId]` | Practice: options, static demo hints, feedback, results |
| `/progress`, `/settings` | Streak + week strip, metrics, badges, chapters; language, grade/stream, daily goal, account |
| `/tutor`, `/revision` | Coming soon (reached from Home quick actions) |

Routing is guarded with Expo Router protected routes in
`src/components/AppGate.tsx`: nobody signed in → welcome; `profile.onboarded
=== false` → onboarding; otherwise the app.

### Data

`src/lib/session.tsx` picks the `MatriqApi` implementation: `createSupabaseApi`
for a signed-in account, `createDemoApi(AsyncStorage)` for the guest demo. The
query cache is cleared whenever the mode or account changes. Supabase sessions
are stored in SecureStore (chunked, `src/lib/secure-session-storage.ts`);
`detectSessionInUrl: false`; tokens auto-refresh only in the foreground.

`createSupabaseApi` currently rejects with `not_configured`; the app shows an
honest "account data is not available on this build yet" state with Retry,
"Explore the demo instead" and Sign out. It never substitutes demo data for an
account.

Study time is recorded from the lesson reader while the screen is focused and
the app is in the foreground (`src/lib/study-time.ts`, ≤1800 s per call).

### Strings

Shared strings come from `@matriq/i18n`. Mobile-only strings live in
`src/i18n/mobile-strings.ts` (English, `m.*` keys) until they move into the
shared package. Academic content is always rendered in English
(`<AppText academic>`, `accessibilityLanguage="en"`).

## Checks

```bash
pnpm --filter @matriq/mobile typecheck
pnpm --filter @matriq/mobile test            # jest-expo + React Native Testing Library 14
cd apps/mobile && npx expo export --platform android   # Metro bundles the monorepo for Android
cd apps/mobile && npx expo-doctor@latest
```

Visual check (a verification aid only; the product is the native app):

```bash
cd apps/mobile
npx expo export --platform web --output-dir /tmp/matriq-web
NODE_PATH=$(npm root -g) node scripts/screenshots.mjs /tmp/matriq-web   # needs Playwright + Chromium
```

Screenshots land in `screenshots/` (390×844, demo flow).

## Build and release on Google Play

Profiles are in `eas.json`:

| Profile | Output | Use |
| --- | --- | --- |
| `development` | Debug APK with the dev client | Daily development on a device |
| `preview` | Release APK, internal distribution | Testers install directly |
| `production` | AAB, version code auto-incremented remotely | Google Play |

First release checklist:

1. **Confirm the application ID.** `com.matriq.app` in `app.config.ts` is a
   placeholder. It cannot change after the first Play upload.
2. `npx eas-cli login` and `npx eas-cli init` (adds the EAS project ID; set
   `EAS_PROJECT_ID` or let `eas init` write it).
3. Set `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` for the
   `preview` and `production` environments (`eas env:create`).
4. `npx eas-cli build --platform android --profile production`. Let EAS
   generate and hold the upload keystore (Play App Signing).
5. Create the app in the Play Console, complete the store listing, content
   rating, **Data safety** form (email address for sign-in; learning progress;
   no ads), target audience (teenagers: review the Families policy), and the
   privacy policy URL.
6. Upload the first AAB manually to the internal testing track (Play requires
   the first upload through the console), then automate later uploads with
   `npx eas-cli submit --platform android --profile production` (a Google
   service-account key is needed; the submit profile targets the internal
   track as a draft).
7. Replace the generated icon/splash (`pnpm --filter @matriq/mobile assets`
   renders them from the brand mark) with final artwork if design provides it,
   and add store screenshots.

Not yet done: no build has been run on a physical Android device or emulator
from this repository; widgets, push reminders and offline lesson caching are
later phases.

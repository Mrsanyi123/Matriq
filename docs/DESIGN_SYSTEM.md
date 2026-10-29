# Matriq design system

Source of truth for the visual language: `design-reference/matriq-mobile.html`
and `design-reference/matriq-mobile-preview.png`. Tokens live in
`packages/ui/src/tokens.ts` (`@matriq/ui`) and are shared by web and mobile.

> **Rule:** never hard-code a colour, radius or font size in app code. Import
> it from `@matriq/ui` (mobile) or use the CSS variables / Tailwind theme the
> web app derives from it.

## Personality

Friendly, calm, youthful, motivating, polished — enjoyable without being
childish. The prototype achieves this with four moves, which every new screen
must keep:

1. **One muted green family** on soft off-white, with a single warm accent
   (orange, for streaks only) and a single cool accent (lavender, for AI only).
2. **Generous rounding** (14–27px) and spacious layouts.
3. **Tactile "ledge" shadows** — a solid offset under buttons, path nodes and
   cards (`box-shadow: 0 4px 0 <darker>`), which compresses on press.
4. **Quiet copy** — short sentences ("One chapter at a time.", "Small steps.
   Real progress.") and honest demo notices.

Avoid: corporate dashboards, gradients, extra accent colours, dense panels,
hero banners, gratuitous animation, generic SaaS look.

## Colour

| Token | Hex | Use |
| --- | --- | --- |
| `bg` | `#fbfcf8` | App background |
| `canvas` | `#e9ede4` | Outer canvas (desktop gutter, behind sheets) |
| `paper` | `#ffffff` | Cards, options, tab bar |
| `ink` | `#26392d` | Headings and primary text |
| `muted` | `#687667` | Secondary text |
| `body` | `#4f5e4c` | Lesson body copy |
| `line` | `#e6eadf` | Borders and dividers |
| `green` | `#557e40` | Primary buttons, eyebrows, icons |
| `greenDark` | `#3d662e` | Primary ledge, active nav text |
| `soft` | `#edf3e5` | Active nav pill, quiet buttons, chapter numbers |
| `lime` | `#dbe9bc` | Completed highlights |
| `orange` | `#bc7626` | Streak flame and count **only** |
| `aiBg` / `aiInk` | `#eeedf8` / `#685991` | AI help entry points **only** |
| `tutorBg` / `tutorInk` | `#f8f7fc` / `#625676` | AI responses |
| `rightBg` / `rightBorder` | `#edf5e4` / `#759d51` | Correct answer |
| `wrongBg` / `wrongBorder` | `#fdf1e9` / `#dba27e` | Incorrect answer (warm, never red) |
| `focus` | `#758cce` | Focus ring (3px, 3px offset) |

Full list, including learning-path node states, in `tokens.ts`.

### Accessibility adjustments to the prototype

`packages/ui/src/ui.test.ts` checks every text/background pair against WCAG
AA. Three prototype colours failed by a hair and were darkened minimally:

| Token | Prototype | Now | Why |
| --- | --- | --- | --- |
| `green` | `#588342` | `#557e40` | White button text was 4.43:1 (needs 4.5) |
| `label` | `#7c8873` | `#6c7765` | Small map labels were 3.6:1 |
| `offlineInk` | `#8d692e` | `#8c682e` | 4.495:1 on the offline banner |

Incorrect answers deliberately use warm orange-beige rather than red: a
mistake is part of learning, not an alarm.

## Typography

- **Latin:** Nunito (rounded, open, closest free match to the prototype's
  `ui-rounded`/SF Pro Rounded intent). Weights 400, 600, 700, 800.
- **Ethiopic:** Noto Sans Ethiopic, listed second in the font stack so Amharic
  text renders properly on every device.
- **Subject glyph:** Georgia italic "ƒ" for Mathematics in the course switch.

| Style | Size / line | Weight | Tracking | Use |
| --- | --- | --- | --- | --- |
| display | 30 / 37 | 800 | −0.65 | Page titles ("Your learning path") |
| title | 24 / 30 | 700 | −0.65 | Section and sheet titles |
| question | 24 / 34 | 700 | −0.55 | Practice question prompt |
| heading | 18 / 22 | 700 | −0.4 | Card headings |
| body | 16 / 25 | 400 | 0 | UI text |
| article | 16 / 29 | 400 | 0 | Lesson reading (line-height 1.8) |
| label | 15 / 20 | 700 | −0.25 | Node titles, option text, buttons |
| small | 13 / 19 | 600 | 0 | Meta, segmented control |
| caption | 11 / 15 | 600 | 0 | Tab labels, hints |
| eyebrow | 10 / 14 | 800 | +1.7, UPPERCASE | "CHAPTER 01" |

Academic content (lesson text, questions, explanations) stays in English and
must be marked `lang="en"` (web) / announced in English (mobile) even when the
interface is Amharic or Afaan Oromoo.

## Shape, space and depth

- Radii: `md 14` (icon buttons, segmented), `button 16`, `lg 17` (options,
  course switch), `card 18` (stat/badge/feedback cards), `xl 22` (large
  cards), `node 25` (path nodes), `sheet 27` (bottom sheets), `reward 38`.
- Page gutter: 22px on mobile (17px under 360px). Desktop content max width
  1080px; reading column max 680px.
- Touch targets: **min 44×44**. Buttons are 53px tall.
- Ledges: primary button `0 4px 0 greenDark`; secondary `0 3px 0 #e6eadf`;
  cards `0 3px 0 #e9ede3`; path nodes `0 5px 0 <node ledge>`. On press,
  translate 3px down and reduce the ledge to 1px.

## Components (shared anatomy, platform-specific implementation)

| Component | Anatomy (from prototype) |
| --- | --- |
| **Primary button** | Full width, 53px, radius 16, green, white 15/750 label + trailing arrow, ledge. Variants: `secondary` (white, line border), `quiet` (soft bg, dark text, no ledge). |
| **Brand** | Leaf in a rotated (−8°) green blob `31×34`, radius `11 11 14 4`, + "matriq" 26/850 tracking −1.5 + lime-green dot. |
| **Top bar** | Brand left; streak chip (orange flame + count) and language button (globe + EN/አማ/OM, 44px, radius 14) right. |
| **Sub bar** | 44px back icon button, title (13 bold) + subtitle (11 muted), language button. Bottom border. |
| **Course switch** | White card radius 17 with card ledge; subject glyph tile 40×40 radius 13 (`#edf3e3`); name + "Grade 12"; chevron. Opens the course sheet. |
| **Learning path** | Winding 16px trail (`trail` colour) with a dotted centre line; 68×68 nodes radius 25 alternating left/indented; states: idle, current (green + ring + ledge), complete (lime + check). Label: eyebrow "CHAPTER 01", title 15/700, status line ("Read chapter →", "Up next", "Completed"). Two faint leaf decorations. |
| **Segmented control** | Track `#edf0e6` radius 14 padding 5; active segment white with soft shadow; 43px tall. "Full lesson" / "Quick notes". |
| **Lesson article** | Numbered sections ("01" green 11/850 + heading 17–18), body 16/1.8 `body` colour; key-note cards with check icon; worked-example card (`exampleBg`, eyebrow "WORKED EXAMPLE"); function plot figure (SVG + table). |
| **Answer option** | Min 66px, radius 17, 1.5px border with 3px bottom border; key tile A–D 31×31 radius 10. States: selected (green border + tint, filled key), right, wrong, disabled. |
| **AI help** | Lavender pill button with sparkle icon and "Demo" tag; expanded tutor card shows numbered hints and "Another hint →". AI is the only lavender UI. |
| **Feedback card** | Success (`successBg`) "Well done!" or retry (`retryBg`) "Good try!" with explanation. |
| **Progress bar** | 7px track `progressTrack`, fill `progressFill`, radius 12. |
| **Stat tile** | White, line border, radius 18, number 27/800 over 11px caption. |
| **Week strip** | 7 day dots 31px; active = `lime`-ish fill + check; today = outline ring. |
| **Badge card** | Medal tile 46×46 radius 16; earned = gold (`badgeEarnedBg`). |
| **Bottom sheet** | Radius 27 top, handle 36×4, title 23, options 62px with check / empty circle. Overlay `overlay` + 3px blur. Focus-trapped, Escape closes. |
| **Offline banner** | `offlineBg`, 11px text, radius 10. |
| **Demo notice** | 10px centred muted text at the bottom of content screens: "Sample content. Not official exam material." |

## Layout

### Web (production dashboard)

- **Desktop ≥1024px:** persistent left sidebar (248px, collapsible to 76px
  icons-only) with the brand, nav (Home, Learn, Practice, Revision, Library,
  AI Tutor, Progress, Study Planner) and a footer with Settings and Profile.
  Active item = `soft` pill + `greenDark` text, like the prototype tab bar.
- **Compact top bar** (64–72px): current course switch, search, notifications,
  language button, avatar.
- **Main area:** `bg` background, content centred to 1080px; reading screens
  (lesson, practice) use a 680px column so line lengths stay comfortable.
- **Tablet 768–1023px:** collapsed icon sidebar.
- **Mobile web <768px:** prototype layout — top bar + bottom tab bar
  (Home, Learn, Practice, Library, Profile) — never a squeezed sidebar.

### Mobile (React Native)

Bottom tabs: **Home, Learn, Practice, Library, Profile** (76px, icon in a 57×29
pill, 11px label). AI Tutor and Revision are reached contextually: the AI help
button inside practice/lessons, a "Quick revision" quick action on Home, and
an "Ask AI" action. Native stack navigation with back gestures, safe areas,
keyboard avoidance and accessible modal sheets.

## Motion

- Press: 120ms translate (ledge compress). Page entrance: 180ms fade/rise 5px.
  Sheet: 180ms slide 30px.
- Respect reduced motion (`prefers-reduced-motion` / `AccessibilityInfo`) —
  disable all non-essential animation.

## Iconography

Lucide icons on both platforms (`lucide-react`, `lucide-react-native`),
stroke 1.9, rounded caps. Mapping from the prototype's hand-drawn set:
book→`BookOpen`, layers→`Layers`, spark→`Sparkles`, trophy→`Trophy`,
flame→`Flame`, map→`Map`, bolt→`Zap`, chart→`ChartNoAxesColumn`,
globe→`Globe`, leaf→`Leaf`, check→`Check`, arrow→`ArrowRight`,
left→`ChevronLeft`, star→`Star`, play→`Play`. Navigation definitions are in
`packages/ui/src/navigation.ts`.

## Language

Interface languages: English, Amharic (አማርኛ), Afaan Oromoo. The prototype's
translations are preserved verbatim in `packages/i18n`. Keys added for the
production apps exist in English; the visible student-facing ones (dashboard,
onboarding, sign-in, lesson, results) are also translated, and the remaining
~70 (mostly accessibility labels and rare states) fall back to English —
`missingKeys(lang)` lists them. **All Amharic and Afaan Oromoo strings need review by
native speakers before launch** — including tone (the prototype's Amharic uses
the informal masculine second person, e.g. "ትችላለህ"; consider gender-neutral
or polite forms).

## Dark mode

Not in Phase 1. The token structure (semantic names) allows adding a dark
palette later without touching components.

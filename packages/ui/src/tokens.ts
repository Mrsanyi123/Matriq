/**
 * Matriq design tokens, extracted from design-reference/matriq-mobile.html.
 * See docs/DESIGN_SYSTEM.md for usage rules.
 *
 * Platform-neutral plain values: the web app maps them to CSS variables and
 * Tailwind theme tokens; the mobile app uses them directly in StyleSheets.
 */

export const palette = {
  /** App background (soft off-white). */
  bg: '#fbfcf8',
  /** Outer canvas behind the phone frame / page gutter on wide screens. */
  canvas: '#e9ede4',
  paper: '#ffffff',
  ink: '#26392d',
  muted: '#687667',
  /** Body copy inside lessons. */
  body: '#4f5e4c',
  /** Small uppercase labels (chapter numbers on the map). */
  label: '#6c7765', // prototype #7c8873, darkened for WCAG AA
  line: '#e6eadf',
  green: '#557e40', // prototype #588342, darkened for WCAG AA (white text 4.72:1)
  greenDark: '#3d662e',
  soft: '#edf3e5',
  lime: '#dbe9bc',
  orange: '#bc7626',
  focus: '#758cce',

  segmentedTrack: '#edf0e6',
  progressTrack: '#e9eddf',
  progressFill: '#84a757',
  exampleBg: '#f0f4e7',
  exampleInk: '#3e5735',

  // Learning-path nodes
  trail: '#e5eadc',
  nodeIdle: '#ecf0e5',
  nodeIdleInk: '#86947c',
  nodeIdleLedge: '#d7dfcb',
  nodeCurrent: '#78a04e',
  nodeCurrentLedge: '#4e7839',
  nodeCurrentRing: '#e4edd5',
  nodeDone: '#d8e7bb',
  nodeDoneInk: '#4e7839',
  nodeDoneLedge: '#b6ce95',
  nodeLabel: '#46573d',
  decoration: '#b1c397',

  // Answer options
  optionBorder: '#e0e6d7',
  optionKeyBorder: '#e1e6d8',
  optionKeyInk: '#7c8973',
  optionSelectedBorder: '#7da25b',
  optionSelectedBg: '#f0f6e9',
  optionSelectedKey: '#76a04e',
  rightBg: '#edf5e4',
  rightBorder: '#759d51',
  wrongBg: '#fdf1e9',
  wrongBorder: '#dba27e',

  // Feedback
  successBg: '#edf4e5',
  successBorder: '#d5e4c4',
  successInk: '#4f6543',
  retryBg: '#fff3e7',
  retryBorder: '#eedbc4',
  retryInk: '#82664a',

  // AI surfaces (the only non-green accent family)
  aiBg: '#eeedf8',
  aiInk: '#685991',
  aiBorder: '#d9d5ea',
  tutorBg: '#f8f7fc',
  tutorBorder: '#ded8ef',
  tutorTitle: '#776598',
  tutorInk: '#625676',

  // Streaks and rewards
  flameFill: '#f6cf89',
  orbBg: '#fcf0da',
  badgeBg: '#f0f2e9',
  badgeInk: '#a2ad95',
  badgeEarnedBg: '#f8e9c3',
  badgeEarnedInk: '#9a7426',
  rewardBg: '#ebf2d7',
  rewardInk: '#7d9d44',
  rewardLedge: '#d9e5ba',

  // System
  offlineBg: '#fff1da',
  offlineInk: '#8c682e',
  toast: '#293e2d',
  overlay: 'rgba(34, 50, 31, 0.27)',
  danger: '#b3472f',
} as const;

export type PaletteKey = keyof typeof palette;

/** Corner radii in px. Matriq is generously rounded. */
export const radius = {
  xs: 7,
  sm: 10,
  md: 14,
  lg: 17,
  xl: 22,
  node: 25,
  sheet: 27,
  frame: 36,
  pill: 999,
} as const;

/** Spacing scale in px. Page gutter on mobile is 22 (17 below 360px wide). */
export const space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  gutter: 22,
  gutterCompact: 17,
} as const;

export const fontFamily = {
  /** Rounded, friendly Latin face. Loaded via next/font or expo-font. */
  sans: 'Nunito',
  /** Ethiopic script coverage for Amharic. */
  ethiopic: 'Noto Sans Ethiopic',
  /** Used only for the subject glyph "ƒ" in the course switcher. */
  serif: 'Georgia',
} as const;

/** Type scale (px). Letter spacing in px, as in the prototype. */
export const typography = {
  display: { size: 30, lineHeight: 37, weight: '800', letterSpacing: -0.65 },
  title: { size: 24, lineHeight: 30, weight: '700', letterSpacing: -0.65 },
  heading: { size: 18, lineHeight: 22, weight: '700', letterSpacing: -0.4 },
  question: { size: 24, lineHeight: 34, weight: '700', letterSpacing: -0.55 },
  body: { size: 16, lineHeight: 25, weight: '400', letterSpacing: 0 },
  article: { size: 16, lineHeight: 29, weight: '400', letterSpacing: 0 },
  label: { size: 15, lineHeight: 20, weight: '700', letterSpacing: -0.25 },
  small: { size: 13, lineHeight: 19, weight: '600', letterSpacing: 0 },
  caption: { size: 11, lineHeight: 15, weight: '600', letterSpacing: 0 },
  eyebrow: { size: 10, lineHeight: 14, weight: '800', letterSpacing: 1.7 },
} as const;

/**
 * The signature "ledge" shadow: a solid offset under buttons, nodes and cards
 * that makes them feel tactile. On press, translate down and shrink the ledge.
 */
export const ledge = {
  primary: { offsetY: 4, color: palette.greenDark },
  secondary: { offsetY: 3, color: '#e6eadf' },
  card: { offsetY: 3, color: '#e9ede3' },
  nodeIdle: { offsetY: 5, color: palette.nodeIdleLedge },
  nodeCurrent: { offsetY: 5, color: palette.nodeCurrentLedge },
  nodeDone: { offsetY: 5, color: palette.nodeDoneLedge },
  reward: { offsetY: 7, color: palette.rewardLedge },
} as const;

/** Soft ambient shadow for floating surfaces (sheets, frames). */
export const elevation = {
  floating: '0 20px 65px rgba(38, 57, 45, 0.08)',
  segmented: '0 2px 5px rgba(36, 55, 42, 0.04)',
} as const;

export const motion = {
  /** Press feedback. */
  fast: 120,
  /** Page and sheet entrance. */
  base: 180,
  easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
} as const;

/** Minimum touch target (px), per WCAG 2.5.8 / platform guidelines. */
export const touchTarget = 44;

export const layout = {
  mobileTabBarHeight: 76,
  topBarHeight: 72,
  subBarHeight: 67,
  sidebarWidth: 248,
  sidebarCollapsedWidth: 76,
  contentMaxWidth: 1080,
  readingMaxWidth: 680,
} as const;

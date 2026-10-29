import type { MessageKey } from '@matriq/i18n';

/**
 * Icon names refer to Lucide icons (lucide-react on web, lucide-react-native
 * on mobile), so both platforms render the same glyphs.
 */
export type LucideIconName =
  | 'House'
  | 'Map'
  | 'Zap'
  | 'Layers'
  | 'LibraryBig'
  | 'Sparkles'
  | 'ChartNoAxesColumn'
  | 'CalendarClock'
  | 'Settings'
  | 'CircleUserRound';

export interface NavItem {
  key: string;
  labelKey: MessageKey;
  icon: LucideIconName;
  /** Web route. Mobile maps keys to Expo Router routes. */
  href: string;
}

/** Desktop sidebar, in order. Settings/Profile live in the sidebar footer. */
export const WEB_NAV: readonly NavItem[] = [
  { key: 'home', labelKey: 'nav.home', icon: 'House', href: '/home' },
  { key: 'learn', labelKey: 'nav.learn', icon: 'Map', href: '/learn' },
  { key: 'practice', labelKey: 'nav.practice', icon: 'Zap', href: '/practice' },
  { key: 'revision', labelKey: 'nav.revision', icon: 'Layers', href: '/revision' },
  { key: 'library', labelKey: 'nav.library', icon: 'LibraryBig', href: '/library' },
  { key: 'tutor', labelKey: 'nav.tutor', icon: 'Sparkles', href: '/tutor' },
  { key: 'progress', labelKey: 'nav.progress', icon: 'ChartNoAxesColumn', href: '/progress' },
  { key: 'planner', labelKey: 'nav.planner', icon: 'CalendarClock', href: '/planner' },
];

export const WEB_NAV_FOOTER: readonly NavItem[] = [
  { key: 'settings', labelKey: 'nav.settings', icon: 'Settings', href: '/settings' },
  { key: 'profile', labelKey: 'nav.profile', icon: 'CircleUserRound', href: '/profile' },
];

/** Compact mobile tab bar. AI Tutor and Revision get contextual entry points. */
export const MOBILE_TABS: readonly NavItem[] = [
  { key: 'home', labelKey: 'nav.home', icon: 'House', href: '/home' },
  { key: 'learn', labelKey: 'nav.learn', icon: 'Map', href: '/learn' },
  { key: 'practice', labelKey: 'nav.practice', icon: 'Zap', href: '/practice' },
  { key: 'library', labelKey: 'nav.library', icon: 'LibraryBig', href: '/library' },
  { key: 'profile', labelKey: 'nav.profile', icon: 'CircleUserRound', href: '/profile' },
];

/**
 * Learning-path node icons cycle through these (prototype: book, layers,
 * spark, trophy). Completed nodes show `Check`.
 */
export const PATH_NODE_ICONS = ['BookOpen', 'Layers', 'Sparkles', 'Trophy'] as const;

/** Subject icon keys (stored in the database) mapped to Lucide names. */
export const SUBJECT_ICONS: Record<string, string> = {
  function: 'SquareFunction',
  zap: 'Zap',
  flask: 'FlaskConical',
  leaf: 'Leaf',
  languages: 'Languages',
  globe: 'Globe',
  landmark: 'Landmark',
  'chart-line': 'ChartLine',
};

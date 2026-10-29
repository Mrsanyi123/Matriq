import type { LucideIconName } from '@matriq/ui';
import {
  BookOpen,
  CalendarClock,
  ChartLine,
  ChartNoAxesColumn,
  CircleUserRound,
  FlaskConical,
  Flame,
  Globe,
  House,
  Landmark,
  Languages,
  Layers,
  Leaf,
  LibraryBig,
  Map as MapIcon,
  Settings,
  Sparkles,
  SquareFunction,
  Star,
  Trophy,
  Zap,
  type LucideIcon,
} from 'lucide-react';

/** Lucide components for the names used in `@matriq/ui` navigation. */
export const NAV_ICONS: Record<LucideIconName, LucideIcon> = {
  House,
  Map: MapIcon,
  Zap,
  Layers,
  LibraryBig,
  Sparkles,
  ChartNoAxesColumn,
  CalendarClock,
  Settings,
  CircleUserRound,
};

/** `PATH_NODE_ICONS` names → components. */
export const PATH_ICONS: Record<string, LucideIcon> = { BookOpen, Layers, Sparkles, Trophy };

const SUBJECT_ICON_COMPONENTS: Record<string, LucideIcon> = {
  SquareFunction,
  Zap,
  FlaskConical,
  Leaf,
  Languages,
  Globe,
  Landmark,
  ChartLine,
};

export function subjectIcon(lucideName: string | undefined): LucideIcon {
  return (lucideName && SUBJECT_ICON_COMPONENTS[lucideName]) || BookOpen;
}

/** Achievement `iconKey` values (core catalogue) → components. */
const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = { leaf: Leaf, layers: Layers, flame: Flame, star: Star, trophy: Trophy };

export function achievementIcon(iconKey: string): LucideIcon {
  return ACHIEVEMENT_ICONS[iconKey] ?? Star;
}

/** Lucide defaults tuned to the prototype's 1.9 stroke. */
export const ICON_STROKE = 1.9;

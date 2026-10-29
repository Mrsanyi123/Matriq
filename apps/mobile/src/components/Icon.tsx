import {
  ArrowRight,
  Bell,
  BookOpen,
  ChartLine,
  ChartNoAxesColumn,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  CircleUserRound,
  Flame,
  FlaskConical,
  Globe,
  House,
  Landmark,
  Languages,
  Layers,
  Leaf,
  LibraryBig,
  LogOut,
  Mail,
  Map,
  Play,
  RotateCcw,
  Settings,
  Sparkles,
  SquareFunction,
  Star,
  Target,
  Trophy,
  WifiOff,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react-native';

/** Lucide icons used by the app, keyed by their Lucide name (see @matriq/ui). */
const ICONS = {
  ArrowRight,
  Bell,
  BookOpen,
  ChartLine,
  ChartNoAxesColumn,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  CircleUserRound,
  Flame,
  FlaskConical,
  Globe,
  House,
  Landmark,
  Languages,
  Layers,
  Leaf,
  LibraryBig,
  LogOut,
  Mail,
  Map,
  Play,
  RotateCcw,
  Settings,
  Sparkles,
  SquareFunction,
  Star,
  Target,
  Trophy,
  WifiOff,
  X,
  Zap,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

export function isIconName(name: string): name is IconName {
  return name in ICONS;
}

export interface IconProps {
  name: IconName;
  size?: number;
  color: string;
  fill?: string;
  strokeWidth?: number;
}

/** Decorative icon (hidden from screen readers; label the parent instead). */
export function Icon({ name, size = 22, color, fill = 'none', strokeWidth = 1.9 }: IconProps) {
  const Component = ICONS[name];
  return (
    <Component
      size={size}
      color={color}
      fill={fill}
      strokeWidth={strokeWidth}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}

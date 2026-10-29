import type { Achievement, WeekDay } from '@matriq/validation';
import { ledge, palette, radius, space } from '@matriq/ui';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useI18n } from '../i18n/I18nProvider';
import { translateDynamic } from '../i18n/translate';
import { AppText } from './AppText';
import { Icon, isIconName, type IconName } from './Icon';

/** 7px progress track. `value` is 0–1. */
export function ProgressBar({
  value,
  label,
  style,
}: {
  value: number;
  label: string;
  style?: StyleProp<ViewStyle>;
}) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View
      style={[styles.track, style]}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
    >
      <View style={[styles.fill, { width: `${pct * 100}%` }]} />
    </View>
  );
}

/** White card with line border and the card ledge. */
export function Card({
  children,
  style,
  ledged = false,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  ledged?: boolean;
}) {
  return (
    <View
      style={[
        styles.card,
        ledged ? { borderBottomWidth: 1 + ledge.card.offsetY, borderBottomColor: ledge.card.color } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function SectionHeading({ title, aside }: { title: string; aside?: string }) {
  return (
    <View style={styles.sectionHeading}>
      <AppText size={17} lineHeight={22} weight="700" accessibilityRole="header">
        {title}
      </AppText>
      {aside ? (
        <AppText size={12} weight="400" color={palette.muted}>
          {aside}
        </AppText>
      ) : null}
    </View>
  );
}

/** Number over caption (27/800 over 11px). */
export function StatTile({
  value,
  label,
  icon,
  testID,
}: {
  value: string | number;
  label: string;
  icon?: IconName;
  testID?: string;
}) {
  return (
    <View style={styles.stat} testID={testID} accessible accessibilityLabel={`${value} ${label}`}>
      {icon ? (
        <View style={styles.statIcon}>
          <Icon
            name={icon}
            size={18}
            color={icon === 'Flame' ? palette.orange : palette.green}
            fill={icon === 'Flame' ? palette.flameFill : 'none'}
          />
        </View>
      ) : null}
      <AppText size={27} lineHeight={33} weight="800">
        {value}
      </AppText>
      <AppText variant="caption" weight="400" color={palette.muted}>
        {label}
      </AppText>
    </View>
  );
}

function formatDate(date: string, locale: string, options: Intl.DateTimeFormatOptions): string {
  const d = new Date(`${date}T12:00:00Z`);
  try {
    return new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' }).format(d);
  } catch {
    return new Intl.DateTimeFormat('en', { ...options, timeZone: 'UTC' }).format(d);
  }
}

/** Seven day dots; active = lime with a check, today = outline ring. */
export function WeekStrip({ week }: { week: readonly WeekDay[] }) {
  const { locale, t } = useI18n();
  return (
    <View style={styles.days}>
      {week.map((day) => (
        <View
          key={day.date}
          style={styles.day}
          accessible
          accessibilityLabel={`${formatDate(day.date, locale, { weekday: 'long', day: 'numeric', month: 'long' })}${day.active ? `, ${t('m.week.studied')}` : ''}`}
          testID={`week-${day.date}${day.active ? '-active' : ''}`}
        >
          <AppText size={10} weight="600" color={palette.muted}>
            {formatDate(day.date, locale, { weekday: 'narrow' })}
          </AppText>
          <View style={day.isToday ? styles.todayRing : styles.noRing}>
            <View style={[styles.dot, day.active ? styles.dotActive : null]}>
              {day.active ? (
                <Icon name="Check" size={15} color={palette.greenDark} />
              ) : (
                <AppText size={11} weight="600" color={palette.nodeIdleInk}>
                  {Number(day.date.slice(8))}
                </AppText>
              )}
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

const ACHIEVEMENT_ICONS: Record<string, IconName> = { leaf: 'Leaf', layers: 'Layers', flame: 'Flame' };

export function achievementIcon(iconKey: string): IconName {
  const mapped = ACHIEVEMENT_ICONS[iconKey];
  if (mapped) return mapped;
  const pascal = iconKey.charAt(0).toUpperCase() + iconKey.slice(1);
  return isIconName(pascal) ? pascal : 'Star';
}

export function BadgeCard({ achievement }: { achievement: Achievement }) {
  const { t } = useI18n();
  const title = translateDynamic(t, `achievement.${achievement.slug}.title`, achievement.title);
  return (
    <View
      style={styles.badge}
      accessible
      accessibilityLabel={`${title}. ${achievement.earned ? t('earned') : t('locked')}`}
      testID={`badge-${achievement.slug}${achievement.earned ? '-earned' : ''}`}
    >
      <View style={[styles.medal, achievement.earned ? styles.medalEarned : null]}>
        <Icon
          name={achievementIcon(achievement.iconKey)}
          color={achievement.earned ? palette.badgeEarnedInk : palette.badgeInk}
        />
      </View>
      <AppText size={11} lineHeight={15} weight="700" align="center">
        {title}
      </AppText>
      <AppText size={10} weight="400" color={palette.muted} align="center">
        {achievement.earned ? t('earned') : t('locked')}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 7,
    backgroundColor: palette.progressTrack,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: palette.progressFill, borderRadius: radius.md },
  card: {
    backgroundColor: palette.paper,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radius.xl,
    padding: 18,
  },
  sectionHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: space.gutter,
    marginBottom: 14,
    gap: space[2],
  },
  stat: {
    flex: 1,
    minWidth: 140,
    padding: 18,
    backgroundColor: palette.paper,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radius.lg,
  },
  statIcon: { marginBottom: space[1] },
  days: { flexDirection: 'row', justifyContent: 'space-between', gap: 6, marginTop: space.gutter },
  day: { alignItems: 'center', gap: 7, flex: 1 },
  noRing: { padding: 5 },
  todayRing: { padding: 3, borderWidth: 2, borderColor: palette.nodeDoneLedge, borderRadius: radius.pill },
  dot: {
    width: 31,
    height: 31,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotActive: { backgroundColor: palette.lime, borderColor: palette.nodeDoneLedge },
  badge: {
    flex: 1,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radius.lg,
    alignItems: 'center',
    paddingVertical: space[4],
    paddingHorizontal: 5,
    gap: 2,
    backgroundColor: palette.paper,
  },
  medal: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: palette.badgeBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space[2],
  },
  medalEarned: { backgroundColor: palette.badgeEarnedBg },
});

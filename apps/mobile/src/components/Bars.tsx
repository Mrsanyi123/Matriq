import { LANGUAGE_OPTIONS } from '@matriq/i18n';
import { layout, palette, radius, space, touchTarget } from '@matriq/ui';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useI18n } from '../i18n/I18nProvider';
import { AppText } from './AppText';
import { Brand } from './Brand';
import { Icon } from './Icon';

export function LanguageButton({ bare = false }: { bare?: boolean }) {
  const { language, t, openLanguageSheet } = useI18n();
  const option = LANGUAGE_OPTIONS.find((o) => o.code === language);
  return (
    <Pressable
      onPress={openLanguageSheet}
      accessibilityRole="button"
      accessibilityLabel={t('m.home.languageA11y', { language: option?.englishName ?? 'English' })}
      testID="language-button"
      style={({ pressed }) => [
        styles.langButton,
        bare ? styles.langBare : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <Icon name="Globe" size={17} color={palette.ink} />
      <AppText size={12} weight="800">
        {option?.short ?? 'EN'}
      </AppText>
    </Pressable>
  );
}

export function StreakChip({ days, onPress }: { days: number; onPress?: () => void }) {
  const { t } = useI18n();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('m.home.streakA11y', { count: days })}
      testID="streak-chip"
      style={({ pressed }) => [styles.streak, pressed ? styles.pressed : null]}
    >
      <Icon name="Flame" size={23} color={palette.orange} fill={palette.flameFill} />
      <AppText size={16} weight="800" color={palette.orange}>
        {days}
      </AppText>
    </Pressable>
  );
}

/** Home-style top bar: brand left, streak chip and language button right. */
export function TopBar({ streakDays, onStreakPress }: { streakDays?: number; onStreakPress?: () => void }) {
  const { width } = useWindowDimensions();
  return (
    <View style={[styles.topBar, width < 360 ? styles.topBarCompact : null]}>
      <Brand />
      <View style={styles.tools}>
        {streakDays !== undefined ? <StreakChip days={streakDays} onPress={onStreakPress} /> : null}
        <LanguageButton />
      </View>
    </View>
  );
}

/** Stack screen bar: back button, title + subtitle, language button. */
export function SubBar({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
}) {
  const { t } = useI18n();
  return (
    <View style={styles.subBar}>
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel={t('common.back')}
        testID="back-button"
        style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}
      >
        <Icon name="ChevronLeft" color={palette.ink} />
      </Pressable>
      <View style={styles.subTitle} accessible accessibilityRole="header">
        <AppText size={13} weight="700" numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" weight="400" color={palette.muted} numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <LanguageButton bare />
    </View>
  );
}

export function IconButton({
  icon,
  label,
  onPress,
}: {
  icon: 'X' | 'ChevronLeft';
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}
    >
      <Icon name={icon} size={17} color={palette.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  topBar: {
    minHeight: layout.topBarHeight,
    paddingHorizontal: space.gutter,
    paddingVertical: space[3],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.bg,
  },
  topBarCompact: { paddingHorizontal: space.gutterCompact },
  tools: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  langButton: {
    minHeight: touchTarget,
    minWidth: 49,
    backgroundColor: palette.paper,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  langBare: { backgroundColor: 'transparent', borderColor: 'transparent' },
  streak: {
    minHeight: touchTarget,
    minWidth: touchTarget,
    paddingHorizontal: space[1],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[1],
  },
  subBar: {
    minHeight: layout.subBarHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingHorizontal: space[5],
    paddingVertical: 10,
    backgroundColor: palette.bg,
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
  },
  subTitle: { flex: 1, minWidth: 0 },
  iconButton: {
    width: touchTarget,
    height: touchTarget,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
});

import { palette, radius, space } from '@matriq/ui';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

/** Settings-style link row (50px min, top border, chevron). */
export function ListRow({
  icon,
  label,
  value,
  onPress,
  testID,
  first = false,
}: {
  icon: IconName;
  label: string;
  value?: string;
  onPress: () => void;
  testID?: string;
  first?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}: ${value}` : label}
      style={({ pressed }) => [styles.row, first ? styles.first : null, pressed ? styles.pressed : null]}
    >
      <Icon name={icon} size={18} color={palette.green} />
      <AppText size={14} lineHeight={20} weight="600" style={styles.label}>
        {label}
      </AppText>
      {value ? (
        <AppText size={13} weight="400" color={palette.muted} style={styles.value} numberOfLines={1}>
          {value}
        </AppText>
      ) : null}
      <Icon name="ChevronRight" size={17} color={palette.nodeIdleInk} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    minHeight: 54,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: palette.line,
  },
  first: { borderTopWidth: 0 },
  label: { flex: 1 },
  value: { maxWidth: '45%' },
  pressed: { opacity: 0.7 },
});

export function Group({ children }: { children: ReactNode }) {
  return <View style={groupStyles.group}>{children}</View>;
}

const groupStyles = StyleSheet.create({
  group: {
    backgroundColor: palette.paper,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radius.lg,
    paddingHorizontal: space[4],
  },
});

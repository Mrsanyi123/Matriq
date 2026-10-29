import { ledge, palette, radius, space, touchTarget } from '@matriq/ui';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { Ledge } from './Ledge';

export type ButtonVariant = 'primary' | 'secondary' | 'quiet';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  /** Trailing icon; the prototype uses an arrow on primary actions. */
  icon?: IconName | null;
  leadingIcon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const VARIANTS = {
  primary: { bg: palette.green, ink: palette.paper, border: palette.green, ledge: ledge.primary },
  secondary: { bg: palette.paper, ink: palette.ink, border: palette.line, ledge: ledge.secondary },
  quiet: { bg: palette.soft, ink: palette.greenDark, border: palette.soft, ledge: null },
} as const;

/** Full-width 53px button with the prototype's ledge (primary/secondary). */
export function Button({
  label,
  onPress,
  variant = 'primary',
  icon = variant === 'primary' ? 'ArrowRight' : null,
  leadingIcon,
  disabled,
  loading,
  accessibilityHint,
  style,
  testID,
}: ButtonProps) {
  const v = VARIANTS[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={[styles.pressable, inactive ? styles.disabled : null, style]}
    >
      {({ pressed }) => {
        const face = (
          <View style={[styles.face, { backgroundColor: v.bg, borderColor: v.border }]}>
            {loading ? (
              <ActivityIndicator color={v.ink} />
            ) : (
              <>
                {leadingIcon ? <Icon name={leadingIcon} size={17} color={v.ink} /> : null}
                <AppText variant="label" color={v.ink} align="center" style={styles.label}>
                  {label}
                </AppText>
                {icon ? <Icon name={icon} size={17} color={v.ink} /> : null}
              </>
            )}
          </View>
        );
        return v.ledge ? (
          <Ledge ledge={v.ledge} radius={radius.lg} pressed={pressed && !inactive}>
            {face}
          </Ledge>
        ) : (
          <View style={pressed ? styles.quietPressed : null}>{face}</View>
        );
      }}
    </Pressable>
  );
}

export interface TextButtonProps {
  label: string;
  onPress?: () => void;
  icon?: IconName;
  leadingIcon?: IconName;
  color?: string;
  size?: number;
  disabled?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Low-emphasis action ("Another hint →", "Try again"). 44px tall. */
export function TextButton({
  label,
  onPress,
  icon,
  leadingIcon,
  color = palette.greenDark,
  size = 13,
  disabled,
  accessibilityHint,
  style,
  testID,
}: TextButtonProps) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      hitSlop={4}
      style={({ pressed }) => [styles.textButton, pressed ? styles.textPressed : null, style]}
    >
      {leadingIcon ? <Icon name={leadingIcon} size={16} color={color} /> : null}
      <AppText variant="small" size={size} weight="700" color={color}>
        {label}
      </AppText>
      {icon ? <Icon name={icon} size={16} color={color} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: { alignSelf: 'stretch' },
  disabled: { opacity: 0.48 },
  face: {
    minHeight: 53,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
    paddingVertical: space[3],
    paddingHorizontal: 18,
  },
  label: { flexShrink: 1 },
  quietPressed: { opacity: 0.8 },
  textButton: {
    minHeight: touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: space[2],
    alignSelf: 'center',
  },
  textPressed: { opacity: 0.6 },
});

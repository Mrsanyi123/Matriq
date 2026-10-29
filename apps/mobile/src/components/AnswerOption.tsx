import { palette, radius, space } from '@matriq/ui';
import { Pressable, StyleSheet, View } from 'react-native';
import { useI18n } from '../i18n/I18nProvider';
import { AppText } from './AppText';
import { Icon } from './Icon';

export type OptionState = 'idle' | 'selected' | 'right' | 'wrong' | 'locked';

const LOOK: Record<OptionState, { bg: string; border: string; keyBg: string; keyInk: string; keyBorder: string }> = {
  idle: {
    bg: palette.paper,
    border: palette.optionBorder,
    keyBg: palette.paper,
    keyInk: palette.optionKeyInk,
    keyBorder: palette.optionKeyBorder,
  },
  selected: {
    bg: palette.optionSelectedBg,
    border: palette.optionSelectedBorder,
    keyBg: palette.optionSelectedKey,
    keyInk: palette.paper,
    keyBorder: palette.optionSelectedKey,
  },
  right: {
    bg: palette.rightBg,
    border: palette.rightBorder,
    keyBg: palette.paper,
    keyInk: palette.optionKeyInk,
    keyBorder: palette.optionKeyBorder,
  },
  wrong: {
    bg: palette.wrongBg,
    border: palette.wrongBorder,
    keyBg: palette.paper,
    keyInk: palette.optionKeyInk,
    keyBorder: palette.optionKeyBorder,
  },
  locked: {
    bg: palette.paper,
    border: palette.optionBorder,
    keyBg: palette.paper,
    keyInk: palette.optionKeyInk,
    keyBorder: palette.optionKeyBorder,
  },
};

/**
 * Derive an option's state: before checking only `selected` matters; after
 * checking the correct option is `right`, a wrong pick is `wrong`, the rest
 * are locked.
 */
export function optionState(
  optionId: string,
  selectedId: string | null,
  correctId: string | null,
): OptionState {
  if (correctId === null) return optionId === selectedId ? 'selected' : 'idle';
  if (optionId === correctId) return 'right';
  if (optionId === selectedId) return 'wrong';
  return 'locked';
}

export interface AnswerOptionProps {
  label: string;
  body: string;
  state: OptionState;
  /** True when this is the learner's pick (before or after checking). */
  chosen: boolean;
  onPress: () => void;
  testID?: string;
}

/** A–D answer option (min 66px, 1.5px border with a 3px bottom edge). */
export function AnswerOption({ label, body, state, chosen, onPress, testID }: AnswerOptionProps) {
  const { t } = useI18n();
  const look = LOOK[state];
  const checked = state === 'right' || state === 'wrong' || state === 'locked';
  const suffix =
    state === 'right' ? `, ${t('correctShort')}` : state === 'wrong' ? `, ${t('practice.yourAnswer')}` : '';
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={checked}
      accessibilityRole="radio"
      accessibilityLabel={`${t('practice.optionA11y', { label, body })}${suffix}`}
      accessibilityLanguage="en"
      accessibilityState={{ checked: chosen, disabled: checked }}
      style={({ pressed }) => [
        styles.option,
        { backgroundColor: look.bg, borderColor: look.border },
        pressed && !checked ? styles.pressed : null,
      ]}
    >
      <View style={[styles.key, { backgroundColor: look.keyBg, borderColor: look.keyBorder }]}>
        <AppText size={12} weight="700" color={look.keyInk}>
          {label}
        </AppText>
      </View>
      <AppText academic size={17} lineHeight={24} weight="400" style={styles.body}>
        {body}
      </AppText>
      {state === 'right' ? <Icon name="Check" size={17} color={palette.rightBorder} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  option: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1.5,
    borderBottomWidth: 3,
    borderRadius: radius.lg,
    paddingVertical: 13,
    paddingHorizontal: 15,
  },
  pressed: { transform: [{ translateY: 1 }] },
  key: {
    width: 31,
    height: 31,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, paddingRight: space[1] },
});

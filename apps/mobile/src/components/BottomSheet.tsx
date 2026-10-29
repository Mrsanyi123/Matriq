import { motion, palette, radius, space } from '@matriq/ui';
import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from '../i18n/I18nProvider';
import { useReducedMotion } from '../lib/hooks';
import { AppText } from './AppText';
import { IconButton } from './Bars';
import { Icon } from './Icon';

export interface BottomSheetProps {
  visible: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  testID?: string;
}

/**
 * Accessible modal sheet: a separate window on Android (TalkBack stays inside
 * it), `accessibilityViewIsModal` on iOS, back button and scrim close it.
 */
export function BottomSheet({ visible, title, description, onClose, children, testID }: BottomSheetProps) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const slide = useRef(new Animated.Value(reduced ? 0 : 30)).current;

  useEffect(() => {
    if (!visible) return;
    if (reduced) {
      slide.setValue(0);
      return;
    }
    slide.setValue(30);
    Animated.timing(slide, { toValue: 0, duration: motion.base, useNativeDriver: true }).start();
  }, [reduced, slide, visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType={reduced ? 'none' : 'fade'}
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={styles.overlay} testID={testID}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('close.sheet')}
          importantForAccessibility="no"
          accessibilityElementsHidden
        />
        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            { paddingBottom: 26 + insets.bottom, transform: [{ translateY: slide }] },
          ]}
        >
          <View style={styles.handle} />
          <View style={styles.head}>
            <AppText size={23} lineHeight={29} weight="700" accessibilityRole="header" style={styles.title}>
              {title}
            </AppText>
            <IconButton icon="X" label={t('common.close')} onPress={onClose} />
          </View>
          <ScrollView bounces={false} contentContainerStyle={styles.body}>
            {description ? (
              <AppText size={13} lineHeight={21} weight="400" color={palette.muted} style={styles.description}>
                {description}
              </AppText>
            ) : null}
            {children}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

export interface SheetOptionProps {
  label: string;
  sublabel?: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  /** Small tag on the right, e.g. "Coming soon". */
  tag?: string;
  testID?: string;
  academic?: boolean;
}

/** 62px option row with a check (selected) or empty circle. */
export function SheetOption({ label, sublabel, selected, onPress, disabled, tag, testID }: SheetOptionProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      accessibilityRole="radio"
      accessibilityLabel={sublabel && sublabel !== label ? `${label}, ${sublabel}` : label}
      accessibilityState={{ checked: selected, disabled: !!disabled }}
      style={({ pressed }) => [
        styles.option,
        selected ? styles.optionSelected : null,
        pressed ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}
    >
      <View style={styles.optionText}>
        <AppText size={15} lineHeight={21} weight="600">
          {label}
        </AppText>
        {sublabel ? (
          <AppText variant="caption" weight="400" color={palette.muted}>
            {sublabel}
          </AppText>
        ) : null}
      </View>
      {tag ? (
        <View style={styles.tag}>
          <AppText size={10} weight="700" color={palette.muted}>
            {tag}
          </AppText>
        </View>
      ) : null}
      <Icon
        name={selected ? 'Check' : 'Circle'}
        color={selected ? palette.green : palette.nodeIdleLedge}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: palette.overlay },
  sheet: {
    maxHeight: '92%',
    backgroundColor: palette.bg,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingTop: 14,
    paddingHorizontal: space[6],
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: palette.nodeIdleLedge,
    alignSelf: 'center',
    marginBottom: space[5],
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: space[3],
  },
  title: { flex: 1 },
  body: { paddingBottom: space[1] },
  description: { marginBottom: space[5] },
  option: {
    minHeight: 62,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    marginBottom: 10,
    backgroundColor: palette.paper,
  },
  optionSelected: { backgroundColor: palette.soft, borderColor: palette.nodeDoneLedge },
  optionText: { flex: 1 },
  tag: {
    borderRadius: radius.xs,
    backgroundColor: palette.segmentedTrack,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.6 },
});

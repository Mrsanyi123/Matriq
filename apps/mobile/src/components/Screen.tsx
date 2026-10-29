import { motion, palette, radius, space } from '@matriq/ui';
import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type ScrollViewInstance,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useI18n } from '../i18n/I18nProvider';
import { useIsOnline, useReducedMotion } from '../lib/hooks';
import { AppText } from './AppText';
import { Icon } from './Icon';

export function OfflineBanner() {
  const online = useIsOnline();
  const { t } = useI18n();
  if (online) return null;
  return (
    <View style={styles.offline} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Icon name="WifiOff" size={14} color={palette.offlineInk} />
      <AppText variant="caption" weight="600" color={palette.offlineInk} align="center">
        {t('offline.banner')}
      </AppText>
    </View>
  );
}

/** 180ms fade/rise on mount; skipped when the OS asks for reduced motion. */
export function Appear({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  useEffect(() => {
    if (reduced) {
      progress.setValue(1);
      return;
    }
    Animated.timing(progress, {
      toValue: 1,
      duration: motion.base,
      useNativeDriver: true,
    }).start();
  }, [progress, reduced]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }),
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [5, 0] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** 22px page gutter, 17px on narrow phones (< 360dp), as in the prototype. */
export function usePageGutter(): number {
  const { width } = useWindowDimensions();
  return width < 360 ? space.gutterCompact : space.gutter;
}

export interface ScreenProps {
  header?: ReactNode;
  children: ReactNode;
  /** Pinned below the scroll area (e.g. a Check answer button). */
  footer?: ReactNode;
  /** Tab screens: the tab bar already handles the bottom inset. */
  tab?: boolean;
  scroll?: boolean;
  scrollRef?: RefObject<ScrollViewInstance | null>;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Safe-area page with the prototype's 22px gutter and offline banner. */
export function Screen({
  header,
  children,
  footer,
  tab = false,
  scroll = true,
  scrollRef,
  onScroll,
  contentStyle,
  testID,
}: ScreenProps) {
  const edges = tab ? (['top', 'left', 'right'] as const) : (['top', 'left', 'right', 'bottom'] as const);
  const gutter = usePageGutter();
  return (
    <SafeAreaView style={styles.safe} edges={edges} testID={testID}>
      {header}
      <OfflineBanner />
      {scroll ? (
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={[styles.page, { paddingHorizontal: gutter }, contentStyle]}
          keyboardShouldPersistTaps="handled"
          onScroll={onScroll}
          scrollEventThrottle={200}
        >
          <Appear>{children}</Appear>
        </ScrollView>
      ) : (
        <View style={[styles.flex, styles.page, { paddingHorizontal: gutter }, contentStyle]}>{children}</View>
      )}
      {footer ? <View style={[styles.footer, { paddingHorizontal: gutter }]}>{footer}</View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg },
  flex: { flex: 1 },
  page: {
    paddingHorizontal: space.gutter,
    paddingTop: space[2],
    paddingBottom: space[7],
    flexGrow: 1,
  },
  footer: {
    paddingHorizontal: space.gutter,
    paddingTop: space[2],
    paddingBottom: space[3],
    backgroundColor: palette.bg,
  },
  offline: {
    marginHorizontal: space.gutter,
    marginTop: 5,
    marginBottom: 10,
    padding: 10,
    borderRadius: radius.sm,
    backgroundColor: palette.offlineBg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
});

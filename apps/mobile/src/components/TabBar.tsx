import { layout, MOBILE_TABS, palette, radius } from '@matriq/ui';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { useI18n } from '../i18n/I18nProvider';
import { AppText } from './AppText';
import { Icon, isIconName } from './Icon';

/** Expo Router route name for each MOBILE_TABS key. */
export const TAB_ROUTES: Record<string, string> = {
  home: 'index',
  learn: 'learn',
  practice: 'practice',
  library: 'library',
  profile: 'profile',
};

/** Prototype nav: icon in a 57×29 pill, active = soft pill + dark green. */
export function TabBar({ state, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const { t } = useI18n();
  return (
    <View
      style={[styles.bar, { paddingBottom: 9 + insets.bottom, minHeight: layout.mobileTabBarHeight + insets.bottom }]}
      accessibilityRole="tablist"
      accessibilityLabel={t('navigation')}
    >
      {MOBILE_TABS.map((tab) => {
        const index = state.routes.findIndex((r) => r.name === TAB_ROUTES[tab.key]);
        const route = state.routes[index];
        if (!route) return null;
        const focused = index === state.index;
        const label = t(tab.labelKey);
        return (
          <Pressable
            key={tab.key}
            testID={`tab-${tab.key}`}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected: focused }}
            onPress={() => {
              const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigateToTab(route.key);
            }}
            style={styles.item}
          >
            <View style={[styles.pill, focused ? styles.pillActive : null]}>
              {isIconName(tab.icon) ? (
                <Icon name={tab.icon} color={focused ? palette.greenDark : palette.muted} />
              ) : null}
            </View>
            <AppText
              size={11}
              lineHeight={14}
              weight="700"
              color={focused ? palette.greenDark : palette.muted}
              numberOfLines={1}
              maxFontSizeMultiplier={1.3}
            >
              {label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 6,
    paddingTop: 9,
    paddingHorizontal: 18,
    backgroundColor: palette.paper,
    borderTopWidth: 1,
    borderTopColor: palette.line,
  },
  item: { flex: 1, alignItems: 'center', gap: 3, minHeight: 50, justifyContent: 'flex-start' },
  pill: { width: 57, height: 29, borderRadius: radius.md - 2, alignItems: 'center', justifyContent: 'center' },
  pillActive: { backgroundColor: palette.soft },
});

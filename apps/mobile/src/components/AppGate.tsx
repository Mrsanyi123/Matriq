import { isMatriqApiError, queryKeys, STALE_TIME } from '@matriq/api-client';
import { palette, space } from '@matriq/ui';
import { useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useI18n } from '../i18n/I18nProvider';
import { useSession } from '../lib/session';
import { AppText } from './AppText';
import { BrandMark } from './Brand';
import { Button } from './Button';
import { LoadingState } from './States';

const screenOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: palette.bg },
} as const;

/**
 * Decides what the learner may see: welcome (nobody signed in), onboarding
 * (`profile.onboarded === false`) or the app. Uses Expo Router's protected
 * routes, so deep links into the app redirect to the right place.
 */
export function AppGate() {
  const { t } = useI18n();
  const session = useSession();
  const { api, state } = session;
  const profile = useQuery({
    queryKey: api ? queryKeys.profile(api.mode) : ['matriq', 'none', 'profile'],
    queryFn: () => api!.getProfile(),
    enabled: api !== null,
    staleTime: STALE_TIME.learner,
  });

  const loading = state.status === 'loading' || (api !== null && profile.isPending);
  useEffect(() => {
    if (state.status !== 'loading') void SplashScreen.hideAsync().catch(() => undefined);
  }, [state.status]);

  if (loading) {
    return (
      <SafeAreaView style={styles.fill}>
        <LoadingState testID="gate-loading" />
      </SafeAreaView>
    );
  }

  if (api && profile.isError && !profile.data) {
    const unavailable = isMatriqApiError(profile.error) && profile.error.code === 'not_configured';
    return (
      <SafeAreaView style={styles.fill} testID="gate-error">
        <View style={styles.center}>
          <BrandMark scale={1.5} />
          <AppText variant="heading" align="center" style={styles.title}>
            {t('common.error')}
          </AppText>
          <AppText variant="small" weight="400" color={palette.muted} align="center">
            {unavailable ? t('gate.accountUnavailable') : t('offline.needsConnection')}
          </AppText>
          <View style={styles.actions}>
            <Button label={t('common.retry')} variant="secondary" icon="RotateCcw" onPress={() => void profile.refetch()} />
            {unavailable ? (
              <Button
                label={t('gate.useDemo')}
                onPress={() => {
                  void session.signOut().then(() => session.startDemo());
                }}
              />
            ) : null}
            <Button label={t('auth.signOut')} variant="quiet" icon={null} onPress={() => void session.signOut()} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const signedIn = api !== null;
  const onboarded = profile.data?.onboarded === true;
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="welcome" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !onboarded}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && onboarded}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="lesson/[slug]" />
        <Stack.Screen name="session/[chapterId]" options={{ gestureEnabled: false }} />
        <Stack.Screen name="progress" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="tutor" />
        <Stack.Screen name="revision" />
      </Stack.Protected>
    </Stack>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: palette.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.gutter, gap: space[3] },
  title: { marginTop: space[4] },
  actions: { alignSelf: 'stretch', gap: space[3], marginTop: space[4] },
});

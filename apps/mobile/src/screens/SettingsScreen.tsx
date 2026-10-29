import { LANGUAGE_OPTIONS } from '@matriq/i18n';
import { DAILY_GOAL_MINUTES, type DailyGoalMinutes } from '@matriq/types';
import { palette, radius, space, touchTarget } from '@matriq/ui';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../components/AppText';
import { SubBar } from '../components/Bars';
import { Button } from '../components/Button';
import { CourseSheet, streamLabel } from '../components/Course';
import { Group, ListRow } from '../components/ListRow';
import { Screen } from '../components/Screen';
import { ErrorState, LoadingState } from '../components/States';
import { useI18n } from '../i18n/I18nProvider';
import { useInvalidateLearnerData, useMatriqQueries } from '../lib/queries';
import { useApi, useSession } from '../lib/session';

export function SettingsScreen() {
  const { t, language, openLanguageSheet } = useI18n();
  const router = useRouter();
  const session = useSession();
  const api = useApi();
  const queries = useMatriqQueries();
  const invalidate = useInvalidateLearnerData();
  const preferences = useQuery(queries.preferences());
  const profile = useQuery(queries.profile());
  const [courseSheet, setCourseSheet] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const isDemo = session.state.status === 'demo';

  const goal = useMutation({
    mutationFn: (minutes: DailyGoalMinutes) => api.updatePreferences({ dailyGoalMinutes: minutes }),
    onSuccess: () => void invalidate(),
  });

  const header = (
    <SubBar
      title={t('nav.settings')}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/profile'))}
    />
  );

  if (preferences.isPending || profile.isPending) {
    return (
      <Screen header={header}>
        <LoadingState />
      </Screen>
    );
  }
  if (preferences.isError || profile.isError) {
    return (
      <Screen header={header}>
        <ErrorState
          error={preferences.error ?? profile.error}
          onRetry={() => {
            void preferences.refetch();
            void profile.refetch();
          }}
        />
      </Screen>
    );
  }

  const current = goal.isPending && goal.variables ? goal.variables : preferences.data.dailyGoalMinutes;
  const gradeValue = [
    profile.data.gradeLevel ? `${t('chooseGrade')} ${profile.data.gradeLevel}` : null,
    profile.data.stream ? streamLabel(t, profile.data.stream) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Screen header={header} testID="settings-screen">
      <AppText variant="display" accessibilityRole="header" style={styles.title}>
        {t('nav.settings')}
      </AppText>

      <Group>
        <ListRow
          first
          icon="Globe"
          label={t('settings.language')}
          value={LANGUAGE_OPTIONS.find((o) => o.code === language)?.nativeName}
          onPress={openLanguageSheet}
        />
        <ListRow icon="BookOpen" label={t('settings.grade')} value={gradeValue} onPress={() => setCourseSheet(true)} />
      </Group>

      <AppText variant="label" style={styles.heading} accessibilityRole="header">
        {t('settings.dailyGoal')}
      </AppText>
      <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel={t('settings.dailyGoal')}>
        {DAILY_GOAL_MINUTES.map((m) => {
          const active = m === current;
          return (
            <Pressable
              key={m}
              testID={`goal-${m}`}
              onPress={() => goal.mutate(m)}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              accessibilityLabel={t('common.minutes', { count: m })}
              style={[styles.chip, active ? styles.chipActive : null]}
            >
              <AppText size={13} weight="700" color={active ? palette.paper : palette.ink}>
                {t('common.minutes', { count: m })}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      {goal.isError ? (
        <AppText variant="small" color={palette.retryInk}>
          {t('common.error')}
        </AppText>
      ) : null}

      <AppText variant="label" style={styles.heading} accessibilityRole="header">
        {t('settings.account')}
      </AppText>
      {isDemo ? (
        <View style={styles.account}>
          <AppText variant="small" weight="400" color={palette.muted}>
            {t('demo.note')}
          </AppText>
          {confirmReset ? (
            <View style={styles.confirm} accessibilityLiveRegion="polite">
              <AppText variant="small" weight="700">
                {t('resetConfirm')}
              </AppText>
              <Button
                testID="confirm-reset"
                label={t('reset')}
                variant="secondary"
                icon={null}
                onPress={() => {
                  setConfirmReset(false);
                  void session.resetDemo();
                }}
              />
              <Button label={t('cancel')} variant="quiet" icon={null} onPress={() => setConfirmReset(false)} />
            </View>
          ) : (
            <Button
              testID="reset-demo"
              label={t('reset')}
              variant="secondary"
              icon={null}
              leadingIcon="RotateCcw"
              onPress={() => setConfirmReset(true)}
            />
          )}
          <Button
            label={t('demo.exit')}
            variant="quiet"
            icon={null}
            leadingIcon="LogOut"
            onPress={() => void session.signOut()}
          />
        </View>
      ) : (
        <View style={styles.account}>
          {session.state.status === 'signedIn' && session.state.email ? (
            <AppText variant="small" weight="400" color={palette.muted}>
              {t('profile.signedInAs', { email: session.state.email })}
            </AppText>
          ) : null}
          <Button
            label={t('auth.signOut')}
            variant="quiet"
            icon={null}
            leadingIcon="LogOut"
            onPress={() => void session.signOut()}
          />
        </View>
      )}
      <CourseSheet visible={courseSheet} onClose={() => setCourseSheet(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: 18 },
  heading: { marginTop: space[6], marginBottom: space[3] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  chip: {
    minHeight: touchTarget,
    minWidth: 64,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: palette.green, borderColor: palette.green },
  account: { gap: space[3] },
  confirm: {
    gap: space[3],
    padding: space[4],
    borderRadius: radius.lg,
    backgroundColor: palette.retryBg,
  },
});

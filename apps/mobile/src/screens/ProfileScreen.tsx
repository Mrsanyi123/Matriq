import { LANGUAGE_OPTIONS } from '@matriq/i18n';
import { palette, radius, space } from '@matriq/ui';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { AppText } from '../components/AppText';
import { TopBar } from '../components/Bars';
import { Button } from '../components/Button';
import { streamLabel } from '../components/Course';
import { Icon } from '../components/Icon';
import { Group, ListRow } from '../components/ListRow';
import { Screen } from '../components/Screen';
import { ErrorState, LoadingState } from '../components/States';
import { useI18n } from '../i18n/I18nProvider';
import { useMatriqQueries } from '../lib/queries';
import { useSession } from '../lib/session';

export function ProfileScreen() {
  const { t, language, openLanguageSheet } = useI18n();
  const router = useRouter();
  const session = useSession();
  const queries = useMatriqQueries();
  const profile = useQuery(queries.profile());
  const dashboard = useQuery(queries.dashboard());
  const isDemo = session.state.status === 'demo';
  const email = session.state.status === 'signedIn' ? session.state.email : null;

  return (
    <Screen
      tab
      testID="profile-screen"
      header={
        <TopBar
          streakDays={dashboard.data?.stats.streakDays ?? 0}
          onStreakPress={() => router.push('/progress')}
        />
      }
    >
      <AppText variant="display" accessibilityRole="header" style={styles.title}>
        {t('nav.profile')}
      </AppText>
      {profile.isPending ? (
        <LoadingState />
      ) : profile.isError ? (
        <ErrorState error={profile.error} onRetry={() => void profile.refetch()} />
      ) : (
        <>
          <View style={styles.card}>
            <View style={styles.avatar}>
              {profile.data.displayName ? (
                <AppText size={24} weight="800" color={palette.greenDark}>
                  {profile.data.displayName.trim().charAt(0).toUpperCase()}
                </AppText>
              ) : (
                <Icon name="CircleUserRound" size={28} color={palette.greenDark} />
              )}
            </View>
            <View style={styles.flex}>
              <AppText variant="heading" testID="profile-name">
                {profile.data.displayName ?? t('profile.noName')}
              </AppText>
              {profile.data.gradeLevel ? (
                <AppText variant="small" weight="400" color={palette.muted}>
                  {[
                    `${t('chooseGrade')} ${profile.data.gradeLevel}`,
                    profile.data.stream ? streamLabel(t, profile.data.stream) : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </AppText>
              ) : null}
              <AppText variant="caption" weight="600" color={palette.green} style={styles.mode}>
                {isDemo ? t('profile.demoAccount') : t('profile.signedInAs', { email: email ?? '' })}
              </AppText>
            </View>
          </View>

          <Group>
            <ListRow first icon="ChartNoAxesColumn" label={t('nav.progress')} onPress={() => router.push('/progress')} testID="link-progress" />
            <ListRow icon="Settings" label={t('nav.settings')} onPress={() => router.push('/settings')} testID="link-settings" />
            <ListRow
              icon="Globe"
              label={t('appLanguage')}
              value={LANGUAGE_OPTIONS.find((o) => o.code === language)?.nativeName}
              onPress={openLanguageSheet}
            />
          </Group>

          <View style={styles.actions}>
            {isDemo && session.accountsAvailable ? (
              <Button
                label={t('demo.createAccount')}
                variant="secondary"
                icon={null}
                leadingIcon="Mail"
                onPress={() => void session.signOut()}
              />
            ) : null}
            <Button
              testID="sign-out"
              label={isDemo ? t('demo.exit') : t('auth.signOut')}
              variant="quiet"
              leadingIcon="LogOut"
              icon={null}
              onPress={() => void session.signOut()}
            />
          </View>
          {isDemo ? (
            <AppText size={11} weight="400" color={palette.muted} align="center" style={styles.note}>
              {t('demo.note')}
            </AppText>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  title: { marginBottom: 18 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[4],
    padding: space[5],
    borderRadius: radius.xl,
    backgroundColor: palette.soft,
    marginBottom: space[5],
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.lg + 2,
    backgroundColor: palette.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mode: { marginTop: space[1] },
  actions: { gap: space[3], marginTop: space[6] },
  note: { marginTop: space[4] },
});

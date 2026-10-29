import { palette, radius, space } from '@matriq/ui';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../components/AppText';
import { TopBar } from '../components/Bars';
import { TextButton } from '../components/Button';
import { CourseSheet, CourseSwitch } from '../components/Course';
import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { DemoNotice, EmptyState, ErrorState, LoadingState } from '../components/States';
import { useI18n } from '../i18n/I18nProvider';
import { useMatriqQueries } from '../lib/queries';

/** Practice tab: every chapter with "Read the lesson" and "Practice" actions. */
export function PracticeListScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const queries = useMatriqQueries();
  const path = useQuery(queries.coursePath());
  const dashboard = useQuery(queries.dashboard());
  const [sheet, setSheet] = useState(false);

  return (
    <Screen
      tab
      testID="practice-screen"
      header={
        <TopBar
          streakDays={dashboard.data?.stats.streakDays ?? 0}
          onStreakPress={() => router.push('/progress')}
        />
      }
    >
      <View style={styles.title}>
        <AppText variant="display" accessibilityRole="header">
          {t('practiceTitle')}
        </AppText>
        <AppText size={14} weight="400" color={palette.muted} style={styles.sub}>
          {t('practiceSub')}
        </AppText>
      </View>
      <CourseSwitch
        subject={path.data?.subject ?? dashboard.data?.subject ?? null}
        grade={path.data?.gradeLevel ?? dashboard.data?.gradeLevel ?? null}
        onPress={() => setSheet(true)}
      />
      {path.isPending ? (
        <LoadingState />
      ) : path.isError ? (
        <ErrorState error={path.error} onRetry={() => void path.refetch()} />
      ) : !path.data || path.data.chapters.length === 0 ? (
        <EmptyState title={t('comingSoon')} body={t('noQuestions')} />
      ) : (
        <View style={styles.list}>
          {path.data.chapters.map((c) => (
            <View key={c.id} style={styles.row} testID={`practice-row-${c.number}`}>
              <Pressable
                onPress={() => router.push(`/lesson/${c.slug}`)}
                accessibilityRole="button"
                accessibilityLabel={`${t('chapter')} ${c.number}: ${c.title}. ${c.questionCount} ${t('questions')}`}
                style={({ pressed }) => [styles.main, pressed ? styles.pressed : null]}
              >
                <View style={styles.num}>
                  {c.status === 'completed' ? (
                    <Icon name="Check" size={18} color={palette.green} />
                  ) : (
                    <AppText size={15} weight="800" color={palette.green}>
                      {String(c.number).padStart(2, '0')}
                    </AppText>
                  )}
                </View>
                <View style={styles.flex}>
                  <AppText academic variant="label">
                    {c.title}
                  </AppText>
                  <AppText variant="caption" weight="400" color={palette.muted} style={styles.meta}>
                    {`${c.questionCount} ${t('questions')}`}
                  </AppText>
                </View>
                <Icon name="ChevronRight" size={18} color={palette.green} />
              </Pressable>
              <View style={styles.actions}>
                <TextButton
                  label={t('readFirst')}
                  leadingIcon="BookOpen"
                  color={palette.muted}
                  size={12}
                  onPress={() => router.push(`/lesson/${c.slug}`)}
                />
                <TextButton
                  testID={`practice-start-${c.number}`}
                  label={t('practiceNow')}
                  icon="ArrowRight"
                  size={12}
                  disabled={c.questionCount === 0}
                  onPress={() => router.push(`/session/${c.id}`)}
                />
              </View>
            </View>
          ))}
        </View>
      )}
      {path.data?.isDemo ? <DemoNotice text={t('note')} /> : null}
      <CourseSheet visible={sheet} onClose={() => setSheet(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  title: { marginBottom: space[1] },
  sub: { marginTop: 7, marginBottom: space[5] },
  list: { marginTop: 21 },
  row: {
    backgroundColor: palette.paper,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radius.lg + 2,
    marginBottom: space[3],
    overflow: 'hidden',
  },
  main: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 17, paddingHorizontal: space[4] },
  pressed: { backgroundColor: palette.bg },
  num: {
    width: 43,
    height: 43,
    borderRadius: radius.md,
    backgroundColor: palette.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: { marginTop: 5 },
  actions: {
    borderTopWidth: 1,
    borderTopColor: palette.line,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: space[2],
    flexWrap: 'wrap',
  },
});

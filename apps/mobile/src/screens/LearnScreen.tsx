import { palette, space } from '@matriq/ui';
import type { CoursePath } from '@matriq/validation';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '../components/AppText';
import { TopBar } from '../components/Bars';
import { Button } from '../components/Button';
import { CourseSheet, CourseSwitch, subjectLabel } from '../components/Course';
import { LearningPath } from '../components/LearningPath';
import { Screen } from '../components/Screen';
import { DemoNotice, EmptyState, ErrorState, LoadingState } from '../components/States';
import { useI18n } from '../i18n/I18nProvider';
import { useMatriqQueries } from '../lib/queries';

export function LearnScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const queries = useMatriqQueries();
  const path = useQuery(queries.coursePath());
  const dashboard = useQuery(queries.dashboard());
  const profile = useQuery(queries.profile());
  const [sheet, setSheet] = useState(false);

  return (
    <Screen
      tab
      testID="learn-screen"
      header={
        <TopBar
          streakDays={dashboard.data?.stats.streakDays ?? 0}
          onStreakPress={() => router.push('/progress')}
        />
      }
    >
      <View style={styles.title}>
        <AppText variant="display" accessibilityRole="header">
          {t('homeTitle')}
        </AppText>
        <AppText size={14} weight="400" color={palette.muted} style={styles.sub}>
          {t('homeSub')}
        </AppText>
      </View>
      <CourseSwitch
        subject={path.data?.subject ?? dashboard.data?.subject ?? null}
        grade={path.data?.gradeLevel ?? profile.data?.gradeLevel ?? null}
        onPress={() => setSheet(true)}
      />
      {path.isPending ? (
        <LoadingState />
      ) : path.isError ? (
        <ErrorState error={path.error} onRetry={() => void path.refetch()} />
      ) : path.data === null ? (
        <EmptyState
          title={t('comingSoon')}
          body={t('learn.noCourse', {
            subject: dashboard.data?.subject
              ? subjectLabel(t, dashboard.data.subject.slug, dashboard.data.subject.name)
              : '',
          })}
        >
          <Button label={t('change')} variant="secondary" icon={null} onPress={() => setSheet(true)} />
        </EmptyState>
      ) : (
        <PathSection
          path={path.data}
          onOpen={(slug) => router.push(`/lesson/${slug}`)}
        />
      )}
      <CourseSheet visible={sheet} onClose={() => setSheet(false)} />
    </Screen>
  );
}

export function PathSection({ path, onOpen }: { path: CoursePath; onOpen: (slug: string) => void }) {
  const { t } = useI18n();
  const allDone = path.chapters.length > 0 && path.completedCount === path.chapters.length;
  const target =
    path.chapters.find((c) => c.id === path.currentChapterId) ?? path.chapters[0] ?? null;
  return (
    <View>
      <View style={styles.mapTop}>
        <AppText size={13} weight="700">
          {t('chapters')}
        </AppText>
        <AppText size={12} weight="400" color={palette.muted} testID="path-count">
          {`${path.completedCount} / ${path.chapters.length}`}
        </AppText>
      </View>
      {path.chapters.length === 0 ? (
        <EmptyState title={t('noneYet')} />
      ) : (
        <LearningPath
          chapters={path.chapters}
          currentChapterId={path.currentChapterId}
          onOpen={(c) => onOpen(c.slug)}
        />
      )}
      {target ? (
        <Button
          testID="path-cta"
          label={t(allDone ? 'review' : 'read')}
          onPress={() => onOpen(target.slug)}
        />
      ) : null}
      {path.isDemo ? <DemoNotice /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: space[1] },
  sub: { marginTop: 7, marginBottom: space[5] },
  mapTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: space[6],
  },
});

import { palette, radius, space } from '@matriq/ui';
import type { ChapterStatus } from '@matriq/types';
import type { ProgressSummary } from '@matriq/validation';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../components/AppText';
import { SubBar } from '../components/Bars';
import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { DemoNotice, ErrorState, LoadingState } from '../components/States';
import { BadgeCard, Card, SectionHeading, StatTile, WeekStrip } from '../components/Widgets';
import { useI18n } from '../i18n/I18nProvider';
import type { AppMessageKey } from '../i18n/translate';
import { useMatriqQueries } from '../lib/queries';

const STATUS_KEY: Record<ChapterStatus, AppMessageKey> = {
  not_started: 'notStarted',
  reading: 'reading',
  practising: 'learning',
  completed: 'done',
};

export function ProgressScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const queries = useMatriqQueries();
  const progress = useQuery(queries.progress());
  return (
    <Screen
      testID="progress-screen"
      header={
        <SubBar
          title={t('nav.progress')}
          onBack={() => (router.canGoBack() ? router.back() : router.replace('/profile'))}
        />
      }
    >
      {progress.isPending ? (
        <LoadingState />
      ) : progress.isError ? (
        <ErrorState error={progress.error} onRetry={() => void progress.refetch()} />
      ) : (
        <ProgressContent progress={progress.data} onOpen={(slug) => router.push(`/lesson/${slug}`)} />
      )}
    </Screen>
  );
}

export function ProgressContent({
  progress,
  onOpen,
}: {
  progress: ProgressSummary;
  onOpen: (slug: string) => void;
}) {
  const { t } = useI18n();
  const { stats } = progress;
  const completed = progress.chapters.filter((c) => c.status === 'completed').length;
  return (
    <View style={styles.page}>
      <AppText variant="display" accessibilityRole="header">
        {t('progressTitle')}
      </AppText>
      <AppText size={14} weight="400" color={palette.muted} style={styles.sub}>
        {t('progressSub')}
      </AppText>

      <Card style={styles.streakCard}>
        <View style={styles.streakTop} accessible accessibilityLabel={`${stats.streakDays} ${t('days')}`}>
          <View style={styles.orb}>
            <Icon name="Flame" size={30} color={palette.orange} fill={palette.flameFill} />
          </View>
          <View style={styles.flex}>
            <AppText size={25} lineHeight={31} weight="700" testID="progress-streak">
              {`${stats.streakDays} `}
              <AppText size={16} weight="600">
                {t('days')}
              </AppText>
            </AppText>
            <AppText size={12} weight="400" color={palette.muted}>
              {t('homeSub')}
            </AppText>
          </View>
        </View>
        <WeekStrip week={progress.week} />
      </Card>

      <View style={styles.metrics}>
        <StatTile value={stats.xpTotal} label={t('xp')} />
        <StatTile value={stats.questionsAnswered} label={t('questionsDone')} />
        <StatTile value={`${stats.chaptersCompleted}/${stats.chaptersTotal}`} label={t('chaptersDone')} />
        <StatTile
          value={stats.accuracy === null ? t('stats.noAccuracy') : `${stats.accuracy}%`}
          label={t('stats.accuracy')}
        />
      </View>

      <SectionHeading title={t('badges')} />
      <View style={styles.badges}>
        {progress.achievements.map((a) => (
          <BadgeCard key={a.slug} achievement={a} />
        ))}
      </View>

      <SectionHeading title={t('myChapters')} aside={`${completed} / ${progress.chapters.length}`} />
      {progress.chapters.length === 0 ? (
        <AppText variant="small" weight="400" color={palette.muted}>
          {t('noneYet')}
        </AppText>
      ) : (
        progress.chapters.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => onOpen(c.slug)}
            accessibilityRole="button"
            accessibilityLabel={`${t('chapter')} ${c.number}: ${c.title}. ${t(STATUS_KEY[c.status])}`}
            style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
            testID={`progress-row-${c.number}-${c.status}`}
          >
            <View style={styles.num}>
              {c.status === 'completed' ? (
                <Icon name="Check" size={17} color={palette.green} />
              ) : (
                <AppText size={12} weight="800" color={palette.green}>
                  {String(c.number).padStart(2, '0')}
                </AppText>
              )}
            </View>
            <View style={styles.flex}>
              <AppText academic size={14} lineHeight={19} weight="700">
                {c.title}
              </AppText>
              <AppText variant="caption" weight="400" color={palette.muted}>
                {t(STATUS_KEY[c.status])}
              </AppText>
            </View>
            <Icon name="ChevronRight" size={17} color={palette.decoration} />
          </Pressable>
        ))
      )}
      {progress.isDemo ? <DemoNotice text={t('saved')} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { paddingTop: space[2] },
  sub: { marginTop: 7 },
  streakCard: { marginVertical: space.gutter, padding: 21 },
  streakTop: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  orb: {
    width: 55,
    height: 55,
    borderRadius: radius.lg + 2,
    backgroundColor: palette.orbBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: space[3], marginBottom: space[1] },
  badges: { flexDirection: 'row', gap: space[3] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
    minHeight: 56,
  },
  pressed: { opacity: 0.7 },
  num: {
    width: 35,
    height: 35,
    borderRadius: radius.md,
    backgroundColor: palette.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

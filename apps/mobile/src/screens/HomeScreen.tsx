import { partOfDay } from '@matriq/core';
import { DEFAULT_TIME_ZONE } from '@matriq/types';
import { palette, radius, space } from '@matriq/ui';
import type { Dashboard } from '@matriq/validation';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../components/AppText';
import { TopBar } from '../components/Bars';
import { Button } from '../components/Button';
import { subjectLabel } from '../components/Course';
import { Icon, type IconName } from '../components/Icon';
import { Screen } from '../components/Screen';
import { DemoNotice, ErrorState, LoadingState } from '../components/States';
import { Card, ProgressBar, SectionHeading, StatTile, WeekStrip } from '../components/Widgets';
import { useI18n } from '../i18n/I18nProvider';
import { translateDynamic, type AppMessageKey } from '../i18n/translate';
import { useMatriqQueries } from '../lib/queries';

export function HomeScreen() {
  const queries = useMatriqQueries();
  const router = useRouter();
  const dashboard = useQuery(queries.dashboard());
  const preferences = useQuery(queries.preferences());

  return (
    <Screen
      tab
      testID="home-screen"
      header={
        <TopBar
          streakDays={dashboard.data?.stats.streakDays ?? 0}
          onStreakPress={() => router.push('/progress')}
        />
      }
    >
      {dashboard.isPending ? (
        <LoadingState />
      ) : dashboard.isError ? (
        <ErrorState error={dashboard.error} onRetry={() => void dashboard.refetch()} />
      ) : (
        <HomeContent
          dashboard={dashboard.data}
          timeZone={preferences.data?.timeZone ?? DEFAULT_TIME_ZONE}
        />
      )}
    </Screen>
  );
}

const CONTINUE_LABEL: Record<'read' | 'practice' | 'review', AppMessageKey> = {
  read: 'dashboard.startReading',
  practice: 'dashboard.practiceNow',
  review: 'dashboard.reviewNow',
};

export function HomeContent({
  dashboard,
  timeZone,
  now = new Date(),
}: {
  dashboard: Dashboard;
  timeZone: string;
  now?: Date;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const part = partOfDay(now, timeZone);
  const greeting = dashboard.displayName
    ? t(`greeting.${part}` as const, { name: dashboard.displayName })
    : t('greeting.noName');
  const { today, stats, continueStudying: next } = dashboard;
  const goalProgress = today.goalMinutes > 0 ? today.minutes / today.goalMinutes : 0;

  const openChapter = (slug: string) => router.push(`/lesson/${slug}`);

  return (
    <View>
      <View style={styles.title}>
        <AppText variant="display" accessibilityRole="header">
          {greeting}
        </AppText>
        <AppText size={14} weight="400" color={palette.muted} style={styles.sub}>
          {t('dashboard.subtitle')}
        </AppText>
      </View>

      {/* One prominent next step. */}
      <Card ledged style={styles.continue} >
        <AppText size={10} weight="800" color={palette.green} uppercase>
          {t('dashboard.continue')}
        </AppText>
        {next ? (
          <>
            <AppText variant="small" weight="600" color={palette.muted} style={styles.continueMeta}>
              {`${t('chapter')} ${String(next.chapter.number).padStart(2, '0')} · ${dashboard.subject ? subjectLabel(t, dashboard.subject.slug, next.subjectName) : next.subjectName}`}
            </AppText>
            <AppText academic variant="title" testID="continue-title">
              {next.chapter.title}
            </AppText>
            <Button
              testID="continue-button"
              label={t(CONTINUE_LABEL[next.action])}
              style={styles.continueButton}
              onPress={() =>
                next.action === 'practice'
                  ? router.push(`/session/${next.chapter.id}`)
                  : openChapter(next.chapter.slug)
              }
            />
          </>
        ) : (
          <>
            <AppText variant="body" color={palette.muted} style={styles.continueMeta}>
              {dashboard.subject
                ? t('m.learn.noCourse', { subject: subjectLabel(t, dashboard.subject.slug, dashboard.subject.name) })
                : t('dashboard.noCourse')}
            </AppText>
            <Button
              label={t('change')}
              variant="secondary"
              style={styles.continueButton}
              onPress={() => router.navigate('/learn')}
            />
          </>
        )}
      </Card>

      {/* Daily goal */}
      <Card style={styles.block}>
        <View
          accessible
          accessibilityLabel={t('m.home.goalA11y', { minutes: today.minutes, goal: today.goalMinutes })}
        >
          <View style={styles.rowBetween}>
            <View style={styles.rowGap}>
              <Icon name="Target" size={18} color={palette.green} />
              <AppText variant="label">{t('dashboard.dailyGoal')}</AppText>
            </View>
            <AppText variant="small" color={palette.muted}>
              {t('dashboard.minutesOf', { minutes: today.minutes, goal: today.goalMinutes })}
            </AppText>
          </View>
          <ProgressBar value={goalProgress} label={t('dashboard.dailyGoal')} style={styles.goalBar} />
          <AppText variant="small" weight="400" color={today.goalMet ? palette.greenDark : palette.muted}>
            {today.goalMet
              ? t('dashboard.goalMet')
              : t('dashboard.goalLeft', { left: Math.max(0, today.goalMinutes - today.minutes) })}
          </AppText>
        </View>
      </Card>

      <SectionHeading title={t('dashboard.quickActions')} />
      <View style={styles.grid}>
        <QuickAction icon="Zap" label={t('action.practice')} onPress={() => router.navigate('/practice')} />
        <QuickAction icon="Sparkles" ai label={t('action.askAi')} onPress={() => router.push('/tutor')} />
        <QuickAction icon="Layers" label={t('action.revision')} onPress={() => router.push('/revision')} />
        <QuickAction icon="Play" label={t('action.videos')} onPress={() => router.navigate('/library')} />
      </View>

      <SectionHeading title={t('dashboard.activity')} />
      <Card>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${stats.streakDays} ${t('days')}. ${t('nav.progress')}`}
          onPress={() => router.push('/progress')}
          style={styles.streakRow}
          testID="home-streak"
        >
          <View style={styles.orb}>
            <Icon name="Flame" size={26} color={palette.orange} fill={palette.flameFill} />
          </View>
          <View style={styles.flex}>
            <AppText size={22} lineHeight={28} weight="800">
              {`${stats.streakDays} `}
              <AppText size={14} weight="600">
                {t('days')}
              </AppText>
            </AppText>
            <AppText variant="caption" weight="400" color={palette.muted}>
              {t('homeSub')}
            </AppText>
          </View>
          <Icon name="ChevronRight" size={17} color={palette.nodeIdleInk} />
        </Pressable>
        <WeekStrip week={dashboard.week} />
      </Card>
      <View style={[styles.grid, styles.statsGrid]}>
        <StatTile testID="stat-xp" value={stats.xpTotal} label={t('stats.xp')} />
        <StatTile
          testID="stat-chapters"
          value={`${stats.chaptersCompleted}/${stats.chaptersTotal}`}
          label={t('stats.chapters')}
        />
        <StatTile testID="stat-questions" value={stats.questionsAnswered} label={t('stats.questions')} />
        <StatTile
          testID="stat-accuracy"
          value={stats.accuracy === null ? t('stats.noAccuracy') : `${stats.accuracy}%`}
          label={t('stats.accuracy')}
        />
      </View>

      <SectionHeading title={t('reminder.upcoming')} />
      <Card style={styles.rowGap}>
        <Icon name="Bell" size={18} color={palette.green} />
        <View style={styles.flex}>
          {dashboard.nextReminder ? (
            <>
              <AppText variant="label">{dashboard.nextReminder.title}</AppText>
              <AppText variant="small" weight="400" color={palette.muted}>
                {formatDateTime(dashboard.nextReminder.nextAt, locale, timeZone)}
              </AppText>
            </>
          ) : (
            <AppText variant="small" weight="400" color={palette.muted} testID="reminder-empty">
              {t('reminder.none')}
            </AppText>
          )}
        </View>
      </Card>

      {dashboard.recommendations.length > 0 ? (
        <>
          <SectionHeading title={t('dashboard.recommendations')} />
          {dashboard.recommendations.map((rec) => {
            const text = translateDynamic(t, rec.messageKey, rec.messageKey, {
              title: rec.chapter?.title ?? '',
            });
            const chapter = rec.chapter;
            return (
              <Pressable
                key={rec.id}
                testID={`rec-${rec.kind}`}
                disabled={!chapter}
                onPress={() => chapter && openChapter(chapter.slug)}
                accessibilityRole={chapter ? 'button' : 'text'}
                style={({ pressed }) => [styles.rec, pressed ? styles.pressed : null]}
              >
                <Icon name="Leaf" size={18} color={palette.green} />
                <AppText variant="small" weight="600" style={styles.flex}>
                  {text}
                </AppText>
                {chapter ? <Icon name="ChevronRight" size={17} color={palette.nodeIdleInk} /> : null}
              </Pressable>
            );
          })}
        </>
      ) : null}

      {dashboard.isDemo ? (
        <View style={styles.demo} testID="demo-notice">
          <AppText size={10} weight="800" color={palette.muted} uppercase>
            {t('demo.mode')}
          </AppText>
          <AppText variant="small" weight="400" color={palette.muted}>
            {t('demo.note')}
          </AppText>
        </View>
      ) : null}
      {dashboard.isDemo ? <DemoNotice /> : null}
    </View>
  );
}

function formatDateTime(iso: string, locale: string, timeZone: string) {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  };
  try {
    return new Intl.DateTimeFormat(locale, options).format(new Date(iso));
  } catch {
    return new Intl.DateTimeFormat('en', options).format(new Date(iso));
  }
}

function QuickAction({
  icon,
  label,
  onPress,
  ai = false,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  ai?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={`quick-${icon}`}
      style={({ pressed }) => [styles.quick, ai ? styles.quickAi : null, pressed ? styles.pressed : null]}
    >
      <View style={[styles.quickIcon, ai ? styles.quickIconAi : null]}>
        <Icon name={icon} size={20} color={ai ? palette.aiInk : palette.green} />
      </View>
      <AppText variant="label" size={14} color={ai ? palette.aiInk : palette.ink}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  title: { marginBottom: 18 },
  sub: { marginTop: 7 },
  continue: { gap: 2 },
  continueMeta: { marginTop: space[2], marginBottom: 2 },
  continueButton: { marginTop: space[4] },
  block: { marginTop: space[4] },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space[2], flexWrap: 'wrap' },
  rowGap: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  goalBar: { marginVertical: space[3] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[3] },
  statsGrid: { marginTop: space[3] },
  quick: {
    flexGrow: 1,
    flexBasis: '45%',
    minHeight: 92,
    gap: space[2],
    padding: space[4],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.paper,
  },
  quickAi: { backgroundColor: palette.aiBg, borderColor: palette.aiBorder },
  quickIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: palette.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickIconAi: { backgroundColor: palette.paper },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 15, minHeight: 56 },
  orb: {
    width: 50,
    height: 50,
    borderRadius: radius.lg,
    backgroundColor: palette.orbBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rec: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    padding: space[4],
    minHeight: 56,
    borderRadius: radius.lg,
    backgroundColor: palette.soft,
    marginBottom: space[2],
  },
  pressed: { opacity: 0.8 },
  demo: {
    marginTop: space.gutter,
    padding: space[4],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.line,
    gap: space[1],
  },
});

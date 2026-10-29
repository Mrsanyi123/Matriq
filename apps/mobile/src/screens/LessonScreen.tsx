import { palette, radius, space, typography } from '@matriq/ui';
import type { ChapterDetail, LessonSection } from '@matriq/validation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { AppText } from '../components/AppText';
import { SubBar } from '../components/Bars';
import { Button, TextButton } from '../components/Button';
import { FunctionPlot } from '../components/FunctionPlot';
import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { DemoNotice, ErrorState, LoadingState } from '../components/States';
import { useI18n } from '../i18n/I18nProvider';
import { useInvalidateLearnerData, useMatriqQueries } from '../lib/queries';
import { useApi } from '../lib/session';
import { useStudyTimer } from '../lib/study-time';

type Mode = 'full' | 'short';

export function LessonScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t } = useI18n();
  const router = useRouter();
  const api = useApi();
  const queries = useMatriqQueries();
  const invalidate = useInvalidateLearnerData();
  const chapter = useQuery({ ...queries.chapter(slug ?? ''), enabled: !!slug });
  const [mode, setMode] = useState<Mode>('full');
  const markedFor = useRef<string | null>(null);

  const markRead = useMutation({
    mutationFn: (chapterId: string) => api.markLessonRead(chapterId),
    onSuccess: () => void invalidate(),
    onError: () => {
      markedFor.current = null;
    },
  });

  const onRecorded = useCallback(() => void invalidate(), [invalidate]);
  useStudyTimer(api, chapter.data?.id, onRecorded);

  const data = chapter.data;
  const markIfNeeded = useCallback(() => {
    if (!data || markedFor.current === data.id) return;
    markedFor.current = data.id;
    markRead.mutate(data.id);
  }, [data, markRead]);

  // The lesson counts as read once its end has been reached.
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height * 0.85) markIfNeeded();
  };

  useEffect(() => {
    markedFor.current = null;
    setMode('full');
  }, [slug]);

  return (
    <Screen
      testID="lesson-screen"
      onScroll={onScroll}
      header={
        <SubBar
          title={t('reading')}
          subtitle={data ? `${t('chapter')} ${data.number}` : undefined}
          onBack={() => (router.canGoBack() ? router.back() : router.replace('/learn'))}
        />
      }
    >
      {chapter.isPending ? (
        <LoadingState />
      ) : chapter.isError ? (
        <ErrorState error={chapter.error} onRetry={() => void chapter.refetch()} />
      ) : (
        <LessonBody
          chapter={chapter.data}
          mode={mode}
          onMode={setMode}
          onPractice={() => {
            markIfNeeded();
            router.push(`/session/${chapter.data.id}`);
          }}
          onChapter={(next) => {
            markIfNeeded();
            router.replace(`/lesson/${next}`);
          }}
        />
      )}
    </Screen>
  );
}

export function LessonBody({
  chapter,
  mode,
  onMode,
  onPractice,
  onChapter,
}: {
  chapter: ChapterDetail;
  mode: Mode;
  onMode: (mode: Mode) => void;
  onPractice: () => void;
  onChapter: (slug: string) => void;
}) {
  const { t } = useI18n();
  const sections = mode === 'full' ? chapter.fullLesson : chapter.quickNotes;
  let textIndex = 0;
  return (
    <View style={styles.reader}>
      <AppText size={10} weight="800" color={palette.green} uppercase style={styles.eyebrow}>
        {`${t('chapter')} ${String(chapter.number).padStart(2, '0')}`}
      </AppText>
      <AppText academic size={28} lineHeight={34} weight="800" accessibilityRole="header">
        {chapter.title}
      </AppText>
      <AppText academic size={14} weight="400" color={palette.muted} style={styles.tagline}>
        {chapter.tagline}
      </AppText>

      <View style={styles.segmented} accessibilityRole="tablist">
        {(['full', 'short'] as const).map((m) => {
          const active = mode === m;
          return (
            <Pressable
              key={m}
              testID={`mode-${m}`}
              onPress={() => onMode(m)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={[styles.segment, active ? styles.segmentActive : null]}
            >
              <AppText size={12} weight="700" color={active ? palette.greenDark : palette.ink} align="center">
                {t(m === 'full' ? 'detailed' : 'short')}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {mode === 'full' && chapter.objectives.length > 0 ? (
        <View style={styles.objectives}>
          <AppText size={10} weight="800" color={palette.greenDark} uppercase>
            {t('lesson.objectives')}
          </AppText>
          {chapter.objectives.map((o) => (
            <View key={o} style={styles.objective}>
              <Icon name="Target" size={16} color={palette.green} />
              <AppText academic size={14} lineHeight={22} weight="400" color={palette.body} style={styles.flex}>
                {o}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}

      <View testID={`article-${mode}`} accessibilityLanguage="en">
        {mode === 'short' ? (
          <AppText variant="title" size={21} style={styles.notesTitle} accessibilityRole="header">
            {t('keyPoints')}
          </AppText>
        ) : null}
        {sections.map((section) => {
          if (section.kind === 'text') textIndex += 1;
          return <Section key={section.id} section={section} index={textIndex} />;
        })}
      </View>

      <View style={styles.bottom}>
        <Button
          testID="practice-chapter"
          label={t('tryQuestion')}
          onPress={onPractice}
          disabled={chapter.questionCount === 0}
        />
        <AppText size={12} weight="400" color={palette.muted} align="center" style={styles.readHint}>
          {t('readHint')}
        </AppText>
        <View style={styles.chapterNav}>
          {chapter.previous ? (
            <TextButton
              label={t('lesson.previous')}
              leadingIcon="ChevronLeft"
              color={palette.muted}
              onPress={() => onChapter(chapter.previous!.slug)}
            />
          ) : (
            <View />
          )}
          {chapter.next ? (
            <TextButton
              testID="next-chapter"
              label={t('nextChapter')}
              icon="ChevronRight"
              onPress={() => onChapter(chapter.next!.slug)}
            />
          ) : null}
        </View>
      </View>
      {chapter.isDemo ? <DemoNotice /> : null}
    </View>
  );
}

function Section({ section, index }: { section: LessonSection; index: number }) {
  const { t } = useI18n();
  switch (section.kind) {
    case 'key_point':
      return (
        <View style={styles.keyNote}>
          <Icon name="Check" size={18} color={palette.green} />
          <AppText academic size={15} lineHeight={25} weight="400" color={palette.body} style={styles.flex}>
            {section.body}
          </AppText>
        </View>
      );
    case 'worked_example':
    case 'formula':
      return (
        <View style={styles.example}>
          <AppText size={10} weight="800" color={palette.greenDark} uppercase>
            {section.kind === 'worked_example' ? t('workedExample') : section.heading ?? ''}
          </AppText>
          <AppText academic variant="article" color={palette.exampleInk} style={styles.exampleBody}>
            {section.body}
          </AppText>
        </View>
      );
    case 'diagram':
      return section.data?.type === 'function_plot' ? (
        <FunctionPlot data={section.data} title={section.heading} caption={section.body} />
      ) : (
        <View style={styles.block}>
          <AppText academic variant="article" color={palette.body}>
            {section.body}
          </AppText>
        </View>
      );
    default:
      return (
        <View style={styles.block}>
          {section.heading ? (
            <View style={styles.sectionHead} accessible accessibilityRole="header">
              <AppText size={11} weight="800" color={palette.green} style={styles.sectionNumber}>
                {String(index).padStart(2, '0')}
              </AppText>
              <AppText academic size={17} lineHeight={22} weight="700" style={styles.flex}>
                {section.heading}
              </AppText>
            </View>
          ) : null}
          <AppText academic variant="article" color={palette.body}>
            {section.body}
          </AppText>
        </View>
      );
  }
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  reader: { paddingTop: 15 },
  eyebrow: { marginBottom: 7 },
  tagline: { marginTop: space[2] },
  segmented: {
    flexDirection: 'row',
    gap: space[1],
    backgroundColor: palette.segmentedTrack,
    borderRadius: radius.md,
    padding: 5,
    marginVertical: 23,
  },
  segment: {
    flex: 1,
    minHeight: 43,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space[2],
    paddingHorizontal: 6,
  },
  segmentActive: {
    backgroundColor: palette.paper,
    shadowColor: palette.ink,
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  objectives: {
    gap: space[2],
    padding: space[4],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.paper,
    marginBottom: 27,
  },
  objective: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  notesTitle: { marginBottom: space[3] },
  block: { marginBottom: 27 },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', gap: space[2], marginBottom: 10 },
  sectionNumber: { minWidth: 16 },
  keyNote: {
    flexDirection: 'row',
    gap: space[3],
    backgroundColor: palette.paper,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radius.lg,
    padding: 15,
    marginBottom: 10,
  },
  example: {
    backgroundColor: palette.exampleBg,
    borderRadius: radius.lg,
    padding: 19,
    marginVertical: space[5],
  },
  exampleBody: { marginTop: space[2], lineHeight: Math.round(typography.article.size * 1.75) },
  bottom: { paddingTop: space[5], paddingBottom: space[2], borderTopWidth: 1, borderTopColor: palette.line },
  readHint: { marginTop: 15 },
  chapterNav: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space[3] },
});

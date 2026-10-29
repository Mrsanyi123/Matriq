import type { MatriqApi } from '@matriq/api-client';
import { ledge, palette, radius, space } from '@matriq/ui';
import type { AttemptResult, PracticeSessionResult, PracticeSet } from '@matriq/validation';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native';
import { AnswerOption, optionState } from '../components/AnswerOption';
import { AppText } from '../components/AppText';
import { SubBar } from '../components/Bars';
import { Button, TextButton } from '../components/Button';
import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { DemoNotice, EmptyState, ErrorState, LoadingState } from '../components/States';
import { achievementIcon, ProgressBar } from '../components/Widgets';
import { useI18n } from '../i18n/I18nProvider';
import { translateDynamic } from '../i18n/translate';
import { useInvalidateLearnerData } from '../lib/queries';
import { useApi } from '../lib/session';

export function PracticeSessionScreen() {
  const { chapterId } = useLocalSearchParams<{ chapterId: string }>();
  const router = useRouter();
  const api = useApi();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/practice'));
  return (
    <PracticeFlow
      api={api}
      chapterId={chapterId ?? ''}
      onBack={goBack}
      onBackToChapters={() => router.dismissTo('/learn')}
      onReview={(slug) => router.replace(`/lesson/${slug}`)}
    />
  );
}

interface FlowProps {
  api: MatriqApi;
  chapterId: string;
  onBack: () => void;
  onBackToChapters: () => void;
  onReview: (slug: string) => void;
}

/** Question → check → feedback → … → results. Learner data refreshes after each step. */
export function PracticeFlow({ api, chapterId, onBack, onBackToChapters, onReview }: FlowProps) {
  const { t } = useI18n();
  const invalidate = useInvalidateLearnerData();
  const [run, setRun] = useState(0);
  const [set, setSet] = useState<PracticeSet | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [hints, setHints] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [xp, setXp] = useState(0);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<unknown>(null);
  const [summary, setSummary] = useState<PracticeSessionResult | null>(null);
  const shownAt = useRef(Date.now());

  useEffect(() => {
    let cancelled = false;
    setSet(null);
    setLoadError(null);
    setIndex(0);
    setSelected(null);
    setResult(null);
    setHints(0);
    setCorrect(0);
    setXp(0);
    setSummary(null);
    setActionError(null);
    api
      .startChapterPractice(chapterId)
      .then((s) => {
        if (cancelled) return;
        setSet(s);
        shownAt.current = Date.now();
      })
      .catch((e: unknown) => {
        if (!cancelled) setLoadError(e);
      });
    return () => {
      cancelled = true;
    };
  }, [api, chapterId, run]);

  const question = set?.questions[index];
  const total = set?.questions.length ?? 0;
  const isLast = index === total - 1;

  const check = useCallback(async () => {
    if (!set || !question || !selected) return;
    setBusy(true);
    setActionError(null);
    try {
      const r = await api.submitAttempt({
        sessionId: set.sessionId,
        questionId: question.id,
        optionId: selected,
        timeSpentMs: Math.min(3_600_000, Math.max(0, Date.now() - shownAt.current)),
      });
      setResult(r);
      if (r.isCorrect) setCorrect((c) => c + 1);
      setXp((x) => x + r.xpAwarded);
      AccessibilityInfo.announceForAccessibility(t(r.isCorrect ? 'correct' : 'wrong'));
      void invalidate();
    } catch (e) {
      setActionError(e);
    } finally {
      setBusy(false);
    }
  }, [api, invalidate, question, selected, set, t]);

  const next = useCallback(async () => {
    if (!set) return;
    if (!isLast) {
      setIndex((i) => i + 1);
      setSelected(null);
      setResult(null);
      setHints(0);
      shownAt.current = Date.now();
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      const s = await api.completePracticeSession(set.sessionId);
      setSummary(s);
      void invalidate();
    } catch (e) {
      setActionError(e);
    } finally {
      setBusy(false);
    }
  }, [api, invalidate, isLast, set]);

  const header = (
    <SubBar
      title={t('practice')}
      subtitle={set ? `${t('chapter')} ${set.chapter.number}` : undefined}
      onBack={onBack}
    />
  );

  if (loadError) {
    return (
      <Screen header={header} testID="practice-session">
        <ErrorState error={loadError} onRetry={() => setRun((r) => r + 1)} />
      </Screen>
    );
  }
  if (!set) {
    return (
      <Screen header={header} testID="practice-session">
        <LoadingState />
      </Screen>
    );
  }
  if (summary) {
    return (
      <Screen header={header} testID="practice-results">
        <Results
          summary={summary}
          xp={xp + summary.xpAwarded}
          onBackToChapters={onBackToChapters}
          onRetry={() => setRun((r) => r + 1)}
          onReview={() => onReview(set.chapter.slug)}
        />
      </Screen>
    );
  }
  if (!question) {
    return (
      <Screen header={header} testID="practice-session">
        <EmptyState title={t('noQuestions')} body={t('m.practice.empty')} />
      </Screen>
    );
  }

  const correctId = result?.correctOptionId ?? null;
  const correctLabel = question.options.find((o) => o.id === correctId)?.label;
  return (
    <Screen header={header} testID="practice-session">
      <ProgressBar
        value={(index + (result ? 1 : 0)) / total}
        label={`${t('question')} ${index + 1} / ${total}`}
        style={styles.progress}
      />
      <View style={styles.meta}>
        <AppText size={11} weight="700" color={palette.muted} testID="question-meta">
          {`${t('question')} ${t('m.practice.questionOf', { current: index + 1, total })}`}
        </AppText>
        {question.isDemo ? (
          <View style={styles.demoTag}>
            <AppText size={11} weight="600" color={palette.muted}>
              {t('demo')}
            </AppText>
          </View>
        ) : null}
      </View>
      <AppText academic variant="question" accessibilityRole="header" style={styles.question} testID="question-prompt">
        {question.prompt}
      </AppText>
      <View style={styles.options} accessibilityRole="radiogroup" accessibilityLabel={t('chooseAnswer')}>
        {question.options.map((o) => (
          <AnswerOption
            key={o.id}
            testID={`option-${o.label}`}
            label={o.label}
            body={o.body}
            chosen={o.id === selected}
            state={optionState(o.id, selected, correctId)}
            onPress={() => setSelected(o.id)}
          />
        ))}
      </View>

      {question.hints.length > 0 ? (
        hints === 0 ? (
          <Pressable
            testID="hint-button"
            onPress={() => setHints(1)}
            accessibilityRole="button"
            accessibilityLabel={`${t('hint')}, ${t('demo')}`}
            style={({ pressed }) => [styles.aiButton, pressed ? styles.pressed : null]}
          >
            <Icon name="Sparkles" color={palette.aiInk} />
            <AppText size={13} weight="700" color={palette.aiInk} style={styles.flex}>
              {t('hint')}
            </AppText>
            <View style={styles.aiTag}>
              <AppText size={9} weight="700" color={palette.aiInk} uppercase>
                {t('demo')}
              </AppText>
            </View>
          </Pressable>
        ) : (
          <View style={styles.tutor} testID="hint-card" accessibilityLiveRegion="polite">
            <View style={styles.tutorHead}>
              <Icon name="Sparkles" size={17} color={palette.tutorTitle} />
              <AppText size={11} weight="700" color={palette.tutorTitle}>
                {t('hintDemo')}
              </AppText>
            </View>
            {question.hints.slice(0, hints).map((h, i) => (
              <AppText key={h} academic size={14} lineHeight={24} weight="400" color={palette.tutorInk} style={styles.hint}>
                <AppText academic size={14} weight="700" color={palette.tutorInk}>{`${i + 1}. `}</AppText>
                {h}
              </AppText>
            ))}
            {hints < question.hints.length ? (
              <TextButton
                testID="next-hint"
                label={t('nextHint')}
                icon="ArrowRight"
                color={palette.aiInk}
                size={12}
                onPress={() => setHints((n) => n + 1)}
              />
            ) : null}
          </View>
        )
      ) : null}

      {result ? (
        <View
          testID={result.isCorrect ? 'feedback-correct' : 'feedback-wrong'}
          accessibilityRole="alert"
          style={[styles.feedback, result.isCorrect ? styles.feedbackYes : styles.feedbackNo]}
        >
          <AppText variant="heading" size={16}>
            {t(result.isCorrect ? 'correct' : 'wrong')}
          </AppText>
          {!result.isCorrect && correctLabel ? (
            <AppText size={14} weight="700" color={palette.retryInk} style={styles.feedbackText}>
              {`${t('rightAnswer')} ${correctLabel}`}
            </AppText>
          ) : null}
          <AppText
            academic
            size={14}
            lineHeight={24}
            weight="400"
            color={result.isCorrect ? palette.successInk : palette.retryInk}
            style={styles.feedbackText}
          >
            {result.explanation}
          </AppText>
        </View>
      ) : null}

      {actionError ? (
        <AppText variant="small" color={palette.retryInk} style={styles.feedbackText}>
          {t('common.error')}
        </AppText>
      ) : null}

      <View style={styles.cta}>
        {result ? (
          <Button
            testID="next-button"
            label={t(isLast ? 'finish' : 'nextQuestion')}
            onPress={() => void next()}
            loading={busy}
          />
        ) : (
          <Button
            testID="check-button"
            label={t('check')}
            onPress={() => void check()}
            disabled={!selected}
            loading={busy}
          />
        )}
      </View>
      {question.isDemo ? <DemoNotice text={t('note')} /> : null}
    </Screen>
  );
}

function Results({
  summary,
  xp,
  onBackToChapters,
  onRetry,
  onReview,
}: {
  summary: PracticeSessionResult;
  xp: number;
  onBackToChapters: () => void;
  onRetry: () => void;
  onReview: () => void;
}) {
  const { t } = useI18n();
  return (
    <View>
      <View style={styles.hero}>
        <View style={styles.rewardWrap}>
          <View style={styles.rewardLedge} />
          <View style={styles.reward}>
            <View style={styles.rewardIcon}>
              <Icon name={summary.passed ? 'Trophy' : 'BookOpen'} size={57} color={palette.rewardInk} />
            </View>
          </View>
        </View>
        <AppText size={29} lineHeight={36} weight="800" align="center" accessibilityRole="header" testID="results-title">
          {t(summary.passed ? 'goodDone' : 'reviewNeeded')}
        </AppText>
        <AppText size={14} weight="400" color={palette.muted} align="center" style={styles.heroSub}>
          {t(summary.passed ? 'progressSub' : 'reviewHint')}
        </AppText>
      </View>
      <View style={styles.resultStats}>
        <View style={styles.resultStat} accessible accessibilityLabel={`${summary.correct} / ${summary.total} ${t('m.results.score')}`}>
          <AppText size={26} lineHeight={32} weight="800" testID="results-score">
            {`${summary.correct}/${summary.total}`}
          </AppText>
          <AppText variant="caption" weight="400" color={palette.muted}>
            {t('m.results.score')}
          </AppText>
        </View>
        <View style={styles.resultStat} accessible accessibilityLabel={`+${xp} ${t('xp')}`}>
          <AppText size={26} lineHeight={32} weight="800" testID="results-xp">
            {`+${xp}`}
          </AppText>
          <AppText variant="caption" weight="400" color={palette.muted}>
            {t('xp')}
          </AppText>
        </View>
      </View>
      {summary.newAchievements.map((a) => (
        <View key={a.slug} style={styles.resultCard} testID={`new-badge-${a.slug}`}>
          <Icon name={achievementIcon(a.iconKey)} size={31} color={palette.rewardInk} />
          <View style={styles.flex}>
            <AppText size={10} weight="800" color={palette.greenDark} uppercase>
              {t('m.results.newBadge')}
            </AppText>
            <AppText size={14} weight="700">
              {translateDynamic(t, `achievement.${a.slug}.title`, a.title)}
            </AppText>
            <AppText size={12} weight="400" color={palette.muted}>
              {translateDynamic(t, `achievement.${a.slug}.description`, a.description)}
            </AppText>
          </View>
        </View>
      ))}
      <Button testID="back-to-chapters" label={t('returnMap')} onPress={onBackToChapters} />
      <TextButton testID="retry" label={t('retry')} leadingIcon="RotateCcw" onPress={onRetry} style={styles.retry} />
      <TextButton testID="review-notes" label={t('review')} leadingIcon="BookOpen" onPress={onReview} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  progress: { marginTop: space[5], marginBottom: 25 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  demoTag: {
    backgroundColor: palette.segmentedTrack,
    borderRadius: radius.xs,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  question: { marginTop: space[5], marginBottom: 25 },
  options: { gap: space[3] },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    minHeight: 51,
    borderRadius: radius.md + 1,
    backgroundColor: palette.aiBg,
    marginVertical: 19,
  },
  aiTag: {
    borderWidth: 1,
    borderColor: palette.aiBorder,
    borderRadius: radius.xs - 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  pressed: { opacity: 0.8 },
  tutor: {
    padding: 17,
    borderWidth: 1,
    borderColor: palette.tutorBorder,
    borderRadius: radius.lg,
    backgroundColor: palette.tutorBg,
    marginTop: space[5],
    marginBottom: space[5],
  },
  tutorHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hint: { marginTop: 10 },
  feedback: { padding: 18, borderRadius: radius.lg, borderWidth: 1, marginVertical: 18 },
  feedbackYes: { backgroundColor: palette.successBg, borderColor: palette.successBorder },
  feedbackNo: { backgroundColor: palette.retryBg, borderColor: palette.retryBorder },
  feedbackText: { marginTop: 7 },
  cta: { marginTop: space.gutter },
  hero: { alignItems: 'center', paddingTop: 30, paddingHorizontal: space[2], paddingBottom: space[5] },
  rewardWrap: { width: 108, height: 108 + ledge.reward.offsetY, marginBottom: 25, transform: [{ rotate: '-7deg' }] },
  rewardLedge: {
    position: 'absolute',
    top: ledge.reward.offsetY,
    width: 108,
    height: 108,
    borderRadius: radius.frame,
    backgroundColor: ledge.reward.color,
  },
  reward: {
    width: 108,
    height: 108,
    borderRadius: radius.frame,
    backgroundColor: palette.rewardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardIcon: { transform: [{ rotate: '7deg' }] },
  heroSub: { marginTop: space[3] },
  resultStats: { flexDirection: 'row', gap: space[3], marginTop: space[5], marginBottom: 26 },
  resultStat: {
    flex: 1,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.paper,
    paddingVertical: space[5],
    paddingHorizontal: space[2],
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  resultCard: {
    backgroundColor: palette.exampleBg,
    borderRadius: radius.lg,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 26,
  },
  retry: { marginTop: 15 },
});

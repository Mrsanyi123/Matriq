import { LANGUAGE_OPTIONS } from '@matriq/i18n';
import { DAILY_GOAL_MINUTES } from '@matriq/types';
import { palette, radius, space } from '@matriq/ui';
import { subjectsForStudent } from '@matriq/validation';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../components/AppText';
import { IconButton, LanguageButton } from '../components/Bars';
import { SheetOption } from '../components/BottomSheet';
import { Button } from '../components/Button';
import { subjectLabel, SubjectGlyph, streamLabel } from '../components/Course';
import { Field } from '../components/Field';
import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { ErrorState, LoadingState } from '../components/States';
import { ProgressBar } from '../components/Widgets';
import { useI18n } from '../i18n/I18nProvider';
import type { AppMessageKey } from '../i18n/translate';
import { useInvalidateLearnerData, useMatriqQueries } from '../lib/queries';
import { useApi } from '../lib/session';
import {
  buildOnboardingInput,
  needsStream,
  stepComplete,
  stepsFor,
  type OnboardingDraft,
  type OnboardingStep,
} from './onboarding-model';

const TITLES: Record<OnboardingStep, AppMessageKey> = {
  grade: 'onboarding.gradeTitle',
  stream: 'onboarding.streamTitle',
  subjects: 'onboarding.subjectsTitle',
  exam: 'onboarding.examTitle',
  language: 'onboarding.languageTitle',
  goal: 'onboarding.goalTitle',
  name: 'onboarding.nameTitle',
};

export function OnboardingScreen() {
  const { t, language, setLanguage } = useI18n();
  const api = useApi();
  const queries = useMatriqQueries();
  const invalidate = useInvalidateLearnerData();
  const options = useQuery(queries.onboardingOptions());
  const [draft, setDraft] = useState<OnboardingDraft>({
    gradeLevel: null,
    stream: null,
    subjectSlugs: [],
    targetExam: null,
    interfaceLanguage: language,
    dailyGoalMinutes: 20,
    displayName: '',
  });
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const steps = stepsFor(draft);
  const step = steps[Math.min(index, steps.length - 1)]!;
  const last = index >= steps.length - 1;
  const update = (patch: Partial<OnboardingDraft>) => {
    setError(null);
    setDraft((d) => ({ ...d, ...patch }));
  };

  async function finish() {
    const built = buildOnboardingInput(draft);
    if (!built.ok) {
      setError(t('common.error'));
      return;
    }
    setSaving(true);
    try {
      await api.completeOnboarding(built.input);
      await invalidate();
    } catch {
      setError(t('common.error'));
      setSaving(false);
    }
  }

  const header = (
    <View style={styles.header}>
      {index > 0 ? (
        <IconButton icon="ChevronLeft" label={t('common.back')} onPress={() => setIndex((i) => i - 1)} />
      ) : (
        <View style={styles.headerSpacer} />
      )}
      <View style={styles.headerMid}>
        <AppText size={11} weight="700" color={palette.muted} align="center">
          {t('onboarding.step', { step: index + 1, total: steps.length })}
        </AppText>
        <ProgressBar value={(index + 1) / steps.length} label={t('onboarding.step', { step: index + 1, total: steps.length })} />
      </View>
      <LanguageButton bare />
    </View>
  );

  const footer = (
    <Button
      testID="onboarding-next"
      label={last ? t('onboarding.finish') : t('common.next')}
      disabled={!stepComplete(step, draft)}
      loading={saving}
      onPress={() => (last ? void finish() : setIndex((i) => i + 1))}
    />
  );

  if (options.isPending) {
    return (
      <Screen header={header}>
        <LoadingState />
      </Screen>
    );
  }
  if (options.isError) {
    return (
      <Screen header={header}>
        <ErrorState error={options.error} onRetry={() => void options.refetch()} />
      </Screen>
    );
  }

  const o = options.data;
  const subjects =
    draft.gradeLevel !== null
      ? subjectsForStudent(o.subjects, draft.gradeLevel, needsStream(draft.gradeLevel) ? draft.stream : null)
      : [];

  return (
    <Screen header={header} footer={footer} testID={`onboarding-${step}`}>
      {index === 0 ? (
        <AppText size={10} weight="800" color={palette.green} uppercase style={styles.eyebrow}>
          {t('onboarding.title')}
        </AppText>
      ) : null}
      <AppText variant="title" accessibilityRole="header" style={styles.title}>
        {t(TITLES[step])}
      </AppText>

      {step === 'grade' ? (
        <View style={styles.gradeGrid} accessibilityRole="radiogroup">
          {o.gradeLevels.map((g) => {
            const active = draft.gradeLevel === g;
            return (
              <Pressable
                key={g}
                testID={`onboarding-grade-${g}`}
                onPress={() =>
                  update({
                    gradeLevel: g,
                    stream: needsStream(g) ? draft.stream : null,
                    subjectSlugs: [],
                  })
                }
                accessibilityRole="radio"
                accessibilityLabel={`${t('chooseGrade')} ${g}`}
                accessibilityState={{ checked: active }}
                style={[styles.grade, active ? styles.gradeActive : null]}
              >
                <AppText size={24} lineHeight={30} weight="800" color={active ? palette.paper : palette.ink}>
                  {String(g)}
                </AppText>
                <AppText size={11} weight="600" color={active ? palette.paper : palette.muted}>
                  {t('chooseGrade')}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {step === 'stream'
        ? o.streams.map((s) => (
            <SheetOption
              key={s.slug}
              testID={`onboarding-stream-${s.slug}`}
              label={streamLabel(t, s.slug)}
              selected={draft.stream === s.slug}
              onPress={() => update({ stream: s.slug, subjectSlugs: [] })}
            />
          ))
        : null}

      {step === 'subjects' ? (
        <View>
          <AppText variant="small" weight="400" color={palette.muted} style={styles.hint}>
            {t('onboarding.subjectsHint')}
          </AppText>
          {subjects.map((s) => {
            const checked = draft.subjectSlugs.includes(s.slug);
            return (
              <Pressable
                key={s.slug}
                testID={`onboarding-subject-${s.slug}`}
                onPress={() =>
                  update({
                    subjectSlugs: checked
                      ? draft.subjectSlugs.filter((x) => x !== s.slug)
                      : [...draft.subjectSlugs, s.slug],
                  })
                }
                accessibilityRole="checkbox"
                accessibilityLabel={`${subjectLabel(t, s.slug, s.name)}${s.hasContent ? '' : `, ${t('comingSoon')}`}`}
                accessibilityState={{ checked }}
                style={[styles.subject, checked ? styles.subjectChecked : null]}
              >
                <SubjectGlyph slug={s.slug} iconKey={s.iconKey} />
                <View style={styles.flex}>
                  <AppText size={15} weight="700">
                    {subjectLabel(t, s.slug, s.name)}
                  </AppText>
                  {!s.hasContent ? (
                    <AppText variant="caption" weight="600" color={palette.muted}>
                      {t('comingSoon')}
                    </AppText>
                  ) : null}
                </View>
                <View style={[styles.box, checked ? styles.boxChecked : null]}>
                  {checked ? <Icon name="Check" size={16} color={palette.paper} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {step === 'exam'
        ? o.targetExams.map((e) => (
            <SheetOption
              key={e.slug}
              testID={`onboarding-exam-${e.slug}`}
              label={t(`exam.${e.slug}` as const)}
              selected={draft.targetExam === e.slug}
              onPress={() => update({ targetExam: e.slug })}
            />
          ))
        : null}

      {step === 'language' ? (
        <View>
          <AppText variant="small" weight="400" color={palette.muted} style={styles.hint}>
            {t('englishOnly')}
          </AppText>
          {LANGUAGE_OPTIONS.map((l) => (
            <SheetOption
              key={l.code}
              testID={`onboarding-language-${l.code}`}
              label={l.nativeName}
              sublabel={l.englishName}
              selected={draft.interfaceLanguage === l.code}
              onPress={() => {
                update({ interfaceLanguage: l.code });
                setLanguage(l.code).catch(() => undefined);
              }}
            />
          ))}
        </View>
      ) : null}

      {step === 'goal' ? (
        <View>
          <AppText variant="small" weight="400" color={palette.muted} style={styles.hint}>
            {t('onboarding.goalHint')}
          </AppText>
          {DAILY_GOAL_MINUTES.map((m) => (
            <SheetOption
              key={m}
              testID={`onboarding-goal-${m}`}
              label={t('common.minutes', { count: m })}
              selected={draft.dailyGoalMinutes === m}
              onPress={() => update({ dailyGoalMinutes: m })}
            />
          ))}
        </View>
      ) : null}

      {step === 'name' ? (
        <Field
          testID="onboarding-name-input"
          label={t('onboarding.nameTitle')}
          hint={t('onboarding.nameHint')}
          placeholder={t('onboarding.namePlaceholder')}
          value={draft.displayName}
          onChangeText={(v) => update({ displayName: v.slice(0, 40) })}
          autoCapitalize="words"
          autoComplete="given-name"
          maxLength={40}
          returnKeyType="done"
        />
      ) : null}

      {error ? (
        <AppText variant="small" weight="600" color={palette.retryInk} style={styles.hint} accessibilityRole="alert">
          {error}
        </AppText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingHorizontal: space[5],
    paddingVertical: 10,
  },
  headerSpacer: { width: 44 },
  headerMid: { flex: 1, gap: 6 },
  eyebrow: { marginTop: space[3] },
  title: { marginTop: space[2], marginBottom: space[5] },
  hint: { marginBottom: space[4] },
  gradeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[3] },
  grade: {
    flexGrow: 1,
    flexBasis: '45%',
    minHeight: 88,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeActive: { backgroundColor: palette.green, borderColor: palette.green },
  subject: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 62,
    padding: space[3],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.paper,
    marginBottom: 10,
  },
  subjectChecked: { backgroundColor: palette.soft, borderColor: palette.nodeDoneLedge },
  box: {
    width: 24,
    height: 24,
    borderRadius: radius.xs,
    borderWidth: 1.5,
    borderColor: palette.nodeIdleLedge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: { backgroundColor: palette.green, borderColor: palette.green },
});

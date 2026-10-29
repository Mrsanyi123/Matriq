import { STREAM_GRADE_LEVELS, type GradeLevel, type Stream } from '@matriq/types';
import { ledge, palette, radius, space, SUBJECT_ICONS, touchTarget } from '@matriq/ui';
import { subjectsForStudent } from '@matriq/validation';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useI18n } from '../i18n/I18nProvider';
import { translateDynamic, type AppTranslator } from '../i18n/translate';
import { useInvalidateLearnerData, useMatriqQueries } from '../lib/queries';
import { useApi } from '../lib/session';
import { AppText } from './AppText';
import { BottomSheet, SheetOption } from './BottomSheet';
import { Button } from './Button';
import { Icon, isIconName } from './Icon';

export function subjectLabel(t: AppTranslator, slug: string, fallback: string) {
  return translateDynamic(t, `subject.${slug}`, fallback);
}

export function streamLabel(t: AppTranslator, slug: Stream) {
  return t(`stream.${slug}` as const);
}

/** Subject glyph tile: italic serif "ƒ" for mathematics, else the Lucide icon. */
export function SubjectGlyph({ slug, iconKey }: { slug: string; iconKey: string }) {
  const lucide = SUBJECT_ICONS[iconKey];
  return (
    <View style={styles.glyph}>
      {slug === 'mathematics' || !lucide || !isIconName(lucide) ? (
        <AppText size={24} lineHeight={30} color={palette.greenDark} style={styles.serif} maxFontSizeMultiplier={1}>
          ƒ
        </AppText>
      ) : (
        <Icon name={lucide} color={palette.greenDark} />
      )}
    </View>
  );
}

export function CourseSwitch({
  subject,
  grade,
  onPress,
}: {
  subject: { slug: string; name: string; iconKey: string } | null;
  grade: number | null;
  onPress: () => void;
}) {
  const { t } = useI18n();
  const name = subject ? subjectLabel(t, subject.slug, subject.name) : t('dashboard.noCourse');
  return (
    <Pressable
      onPress={onPress}
      testID="course-switch"
      accessibilityRole="button"
      accessibilityLabel={t('m.course.subjectA11y', { subject: name, grade: grade ?? '' })}
      style={({ pressed }) => [styles.switch, pressed ? styles.pressed : null]}
    >
      <SubjectGlyph slug={subject?.slug ?? 'mathematics'} iconKey={subject?.iconKey ?? 'function'} />
      <View style={styles.flex}>
        <AppText size={14} lineHeight={19} weight="700">
          {name}
        </AppText>
        {grade ? (
          <AppText variant="caption" weight="400" color={palette.muted}>
            {`${t('chooseGrade')} ${grade}`}
          </AppText>
        ) : null}
      </View>
      <Icon name="ChevronDown" size={17} color={palette.nodeIdleInk} />
    </Pressable>
  );
}

const needsStream = (grade: number) => (STREAM_GRADE_LEVELS as readonly number[]).includes(grade);

/** Course sheet: grade grid, stream (grades 11–12) and the learner's subjects. */
export function CourseSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const api = useApi();
  const queries = useMatriqQueries();
  const invalidate = useInvalidateLearnerData();
  const profile = useQuery({ ...queries.profile(), enabled: visible });
  const preferences = useQuery({ ...queries.preferences(), enabled: visible });
  const options = useQuery({ ...queries.onboardingOptions(), enabled: visible });
  const [pendingGrade, setPendingGrade] = useState<GradeLevel | null>(null);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const grade = pendingGrade ?? profile.data?.gradeLevel ?? null;
  const stream = profile.data?.stream ?? null;
  const awaitingStream = pendingGrade !== null && needsStream(pendingGrade) && stream === null;

  async function run(action: () => Promise<unknown>) {
    setSaving(true);
    setFailed(false);
    try {
      await action();
      await invalidate();
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  }

  function chooseGrade(next: GradeLevel) {
    if (next === profile.data?.gradeLevel) {
      setPendingGrade(null);
      return;
    }
    if (needsStream(next) && stream === null) {
      setPendingGrade(next);
      return;
    }
    setPendingGrade(null);
    void run(() => api.updateProfile({ gradeLevel: next, stream: needsStream(next) ? stream : null }));
  }

  const subjects =
    options.data && grade !== null
      ? subjectsForStudent(options.data.subjects, grade, needsStream(grade) ? stream : null)
      : [];
  const mine = preferences.data?.subjectSlugs ?? [];
  const shown = subjects.filter((s) => mine.length === 0 || mine.includes(s.slug));
  const list = shown.length > 0 ? shown : subjects;

  return (
    <BottomSheet visible={visible} title={t('change')} onClose={onClose} testID="course-sheet">
      <AppText size={10} weight="800" color={palette.green} uppercase>
        {t('chooseGrade')}
      </AppText>
      <View style={styles.gradeGrid} accessibilityRole="radiogroup">
        {(options.data?.gradeLevels ?? [9, 10, 11, 12]).map((g) => {
          const active = g === grade;
          return (
            <Pressable
              key={g}
              testID={`grade-${g}`}
              onPress={() => chooseGrade(g)}
              disabled={saving}
              accessibilityRole="radio"
              accessibilityLabel={`${t('chooseGrade')} ${g}`}
              accessibilityState={{ checked: active, disabled: saving }}
              style={[styles.grade, active ? styles.gradeActive : null]}
            >
              <AppText weight="700" color={active ? palette.paper : palette.ink}>
                {String(g)}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      {awaitingStream && pendingGrade !== null ? (
        <View style={styles.block}>
          <AppText variant="small" weight="400" color={palette.muted} style={styles.hint}>
            {t('m.course.streamNeeded')}
          </AppText>
          {(options.data?.streams ?? []).map((s) => (
            <SheetOption
              key={s.slug}
              label={streamLabel(t, s.slug)}
              selected={false}
              disabled={saving}
              onPress={() => {
                const g = pendingGrade;
                setPendingGrade(null);
                void run(() => api.updateProfile({ gradeLevel: g, stream: s.slug }));
              }}
            />
          ))}
        </View>
      ) : (
        <View style={styles.block}>
          <AppText size={10} weight="800" color={palette.green} uppercase style={styles.subjectHead}>
            {t('chooseSubject')}
          </AppText>
          {list.map((s) => (
            <SheetOption
              key={s.slug}
              testID={`subject-${s.slug}`}
              label={subjectLabel(t, s.slug, s.name)}
              selected={preferences.data?.activeSubjectSlug === s.slug}
              tag={s.hasContent ? undefined : t('comingSoon')}
              disabled={saving}
              onPress={() =>
                void run(() =>
                  api.updatePreferences({
                    activeSubjectSlug: s.slug,
                    subjectSlugs: mine.includes(s.slug) ? mine : [...mine, s.slug],
                  }),
                )
              }
            />
          ))}
        </View>
      )}
      {failed ? (
        <AppText variant="small" weight="600" color={palette.retryInk} style={styles.hint}>
          {t('common.error')}
        </AppText>
      ) : null}
      <Button label={t('continue')} onPress={onClose} loading={saving} style={styles.done} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  switch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    backgroundColor: palette.paper,
    borderWidth: 1,
    borderColor: palette.line,
    borderBottomWidth: 1 + ledge.card.offsetY,
    borderBottomColor: ledge.card.color,
    borderRadius: radius.lg,
    paddingVertical: space[3],
    paddingHorizontal: 14,
    minHeight: touchTarget + 20,
  },
  pressed: { opacity: 0.85 },
  glyph: {
    width: 40,
    height: 40,
    borderRadius: radius.md - 1,
    backgroundColor: palette.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serif: {
    fontFamily: Platform.select({ android: 'serif', ios: 'Georgia', default: 'Georgia, serif' }),
    fontStyle: 'italic',
    fontWeight: '700',
  },
  gradeGrid: { flexDirection: 'row', gap: space[2], marginTop: 14, marginBottom: 25 },
  grade: {
    flex: 1,
    height: 49,
    borderRadius: radius.md - 1,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeActive: { backgroundColor: palette.green, borderColor: palette.green },
  block: { marginBottom: space[2] },
  hint: { marginBottom: space[3] },
  subjectHead: { marginBottom: space[3] },
  done: { marginTop: space[2] },
});

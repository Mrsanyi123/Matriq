'use client';

import { STREAM_GRADE_LEVELS, type GradeLevel, type Stream } from '@matriq/types';
import { SUBJECT_ICONS } from '@matriq/ui';
import { subjectsForStudent } from '@matriq/validation';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useMatriq } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { subjectIcon } from './icons';
import { Button } from './ui/button';
import { Eyebrow, Tag } from './ui/primitives';
import { Sheet, SheetOption } from './ui/sheet';

const needsStream = (grade: number) => (STREAM_GRADE_LEVELS as readonly number[]).includes(grade);

/** Subject glyph tile: Georgia "ƒ" for Mathematics, else the subject icon. */
export function SubjectGlyph({
  slug,
  iconKey,
  className,
}: {
  slug: string | null | undefined;
  iconKey?: string;
  className?: string;
}) {
  const Icon = subjectIcon(iconKey ? SUBJECT_ICONS[iconKey] : undefined);
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid size-10 shrink-0 place-items-center rounded-md bg-soft font-serif text-2xl font-bold text-green-dark',
        className,
      )}
    >
      {slug === 'mathematics' ? 'ƒ' : <Icon className="size-[22px]" strokeWidth={1.9} />}
    </span>
  );
}

/** Course switch card (prototype .course-switch); opens the course sheet. */
export function CourseSwitch({ compact = false, className }: { compact?: boolean; className?: string }) {
  const { t, tOr } = useI18n();
  const { queries } = useMatriq();
  const profile = useQuery(queries.profile());
  const preferences = useQuery(queries.preferences());
  const options = useQuery(queries.onboardingOptions());
  const [open, setOpen] = useState(false);

  const slug = preferences.data?.activeSubjectSlug ?? null;
  const subject = options.data?.subjects.find((s) => s.slug === slug);
  const subjectName = slug ? tOr(`subject.${slug}`, subject?.name ?? slug) : t('dashboard.noCourse');
  const grade = profile.data?.gradeLevel;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={`${t('change')}: ${subjectName}${grade ? `, ${t('chooseGrade')} ${grade}` : ''}`}
        className={cn(
          'flex w-full items-center gap-3 rounded-lg border border-line bg-paper text-left',
          compact ? 'min-h-11 max-w-64 px-2.5 py-1.5' : 'mt-5 px-3.5 py-3 shadow-ledge-card mq-press',
          className,
        )}
      >
        <SubjectGlyph slug={slug} iconKey={subject?.iconKey} className={compact ? 'size-8 rounded-sm text-xl' : undefined} />
        <span className="min-w-0">
          <strong className="block truncate text-sm">{subjectName}</strong>
          {grade ? (
            <small className="block text-caption font-normal text-muted">
              {t('chooseGrade')} {grade}
            </small>
          ) : null}
        </span>
        <ChevronDown className="ml-auto size-[17px] shrink-0 text-node-idle-ink" aria-hidden="true" />
      </button>
      {open && profile.data && preferences.data && options.data ? (
        <CourseSheet
          open={open}
          onOpenChange={setOpen}
          grade={profile.data.gradeLevel ?? 12}
          stream={profile.data.stream}
          subjectSlug={slug}
          subjectSlugs={preferences.data.subjectSlugs}
        />
      ) : null}
    </>
  );
}

function CourseSheet({
  open,
  onOpenChange,
  grade: initialGrade,
  stream: initialStream,
  subjectSlug,
  subjectSlugs,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grade: GradeLevel;
  stream: Stream | null;
  subjectSlug: string | null;
  subjectSlugs: string[];
}) {
  const { t, tOr } = useI18n();
  const { api, queries, invalidateLearnerData } = useMatriq();
  const options = useQuery(queries.onboardingOptions());
  const [grade, setGrade] = useState<GradeLevel>(initialGrade);
  const [stream, setStream] = useState<Stream | null>(initialStream);
  const [subject, setSubject] = useState<string | null>(subjectSlug);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const effectiveStream = needsStream(grade) ? stream : null;
  const subjects = options.data ? subjectsForStudent(options.data.subjects, grade, effectiveStream) : [];
  const canSave = !needsStream(grade) || effectiveStream !== null;

  async function save() {
    setSaving(true);
    setFailed(false);
    try {
      if (grade !== initialGrade || effectiveStream !== initialStream) {
        await api.updateProfile({ gradeLevel: grade, stream: effectiveStream });
      }
      const visible = subjects.some((s) => s.slug === subject);
      const active = visible ? subject : null;
      if (active !== subjectSlug) {
        await api.updatePreferences({
          activeSubjectSlug: active,
          subjectSlugs: active && !subjectSlugs.includes(active) ? [...subjectSlugs, active] : subjectSlugs,
        });
      }
      await invalidateLearnerData();
      onOpenChange(false);
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t('change')}>
      <Eyebrow>{t('chooseGrade')}</Eyebrow>
      <div className="mt-3.5 mb-6 grid grid-cols-4 gap-2" role="radiogroup" aria-label={t('chooseGrade')}>
        {(options.data?.gradeLevels ?? []).map((g) => (
          <button
            key={g}
            type="button"
            role="radio"
            aria-checked={grade === g}
            onClick={() => setGrade(g)}
            className={cn(
              'h-[49px] rounded-md border border-line bg-paper font-bold',
              grade === g && 'border-green bg-green text-paper',
            )}
          >
            {g}
          </button>
        ))}
      </div>
      {needsStream(grade) ? (
        <>
          <Eyebrow className="mb-3">{t('onboarding.streamTitle')}</Eyebrow>
          <div role="radiogroup" aria-label={t('onboarding.streamTitle')} className="mb-4">
            {(options.data?.streams ?? []).map((s) => (
              <SheetOption key={s.slug} selected={stream === s.slug} onClick={() => setStream(s.slug)}>
                {tOr(`stream.${s.slug}`, s.name)}
              </SheetOption>
            ))}
          </div>
        </>
      ) : null}
      <Eyebrow className="mb-3">{t('chooseSubject')}</Eyebrow>
      <div role="radiogroup" aria-label={t('chooseSubject')}>
        {subjects.map((s) => (
          <SheetOption
            key={s.slug}
            selected={subject === s.slug}
            disabled={!s.hasContent}
            aria-disabled={!s.hasContent}
            className={cn(!s.hasContent && 'cursor-default opacity-70')}
            onClick={() => s.hasContent && setSubject(s.slug)}
          >
            <span className="flex items-center gap-2">
              {tOr(`subject.${s.slug}`, s.name)}
              {!s.hasContent ? <Tag>{t('comingSoon')}</Tag> : null}
            </span>
          </SheetOption>
        ))}
      </div>
      {failed ? (
        <p role="alert" className="mb-3 text-sm text-retry-ink">
          {t('common.error')}
        </p>
      ) : null}
      <Button className="mt-2" onClick={save} disabled={saving || !canSave}>
        {t('continue')}
        <ArrowRight className="size-[17px]" aria-hidden="true" />
      </Button>
    </Sheet>
  );
}

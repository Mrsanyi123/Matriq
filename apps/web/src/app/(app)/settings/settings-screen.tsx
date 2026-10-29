'use client';

import { DAILY_GOAL_MINUTES, STREAM_GRADE_LEVELS, type GradeLevel, type Stream } from '@matriq/types';
import * as Dialog from '@radix-ui/react-dialog';
import { useMutation, useQuery } from '@tanstack/react-query';
import { LogOut, RotateCcw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { LanguageOptions } from '@/components/language';
import { useLeave } from '@/components/shell/account-menu';
import { ErrorState, PageSkeleton } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Card, PageTitle, Tag } from '@/components/ui/primitives';
import { Sheet, SheetOption } from '@/components/ui/sheet';
import { useApiContext, useMatriq } from '@/lib/api';
import { isSupabaseConfigured } from '@/lib/env';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const needsStream = (g: number) => (STREAM_GRADE_LEVELS as readonly number[]).includes(g);

function SettingsSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <Card ledge={false} className="p-5 md:p-6" aria-labelledby={id} role="region">
      <h2 id={id} className="mb-4 text-heading">
        {title}
      </h2>
      {children}
    </Card>
  );
}

export function SettingsScreen() {
  const { t } = useI18n();
  const { queries } = useMatriq();
  const profile = useQuery(queries.profile());
  const preferences = useQuery(queries.preferences());

  return (
    <div className="mx-auto max-w-reading">
      <PageTitle title={t('nav.settings')} />
      {profile.isPending || preferences.isPending ? (
        <PageSkeleton cards={4} />
      ) : profile.isError || preferences.isError ? (
        <ErrorState
          error={profile.error ?? preferences.error}
          onRetry={() => {
            void profile.refetch();
            void preferences.refetch();
          }}
        />
      ) : (
        <div className="flex flex-col gap-5">
          <SettingsSection id="settings-language" title={t('settings.language')}>
            <p className="-mt-2 mb-4 text-sm text-muted">{t('englishOnly')}</p>
            <LanguageOptions persist />
          </SettingsSection>
          <SettingsSection id="settings-goal" title={t('settings.dailyGoal')}>
            <DailyGoalPicker value={preferences.data.dailyGoalMinutes} />
          </SettingsSection>
          <SettingsSection id="settings-grade" title={t('settings.grade')}>
            <GradeForm grade={profile.data.gradeLevel ?? 12} stream={profile.data.stream} />
          </SettingsSection>
          <SettingsSection id="settings-account" title={t('settings.account')}>
            <AccountSection />
          </SettingsSection>
        </div>
      )}
    </div>
  );
}

function DailyGoalPicker({ value }: { value: number }) {
  const { t } = useI18n();
  const { api, invalidateLearnerData } = useMatriq();
  const save = useMutation({
    mutationFn: (minutes: (typeof DAILY_GOAL_MINUTES)[number]) => api.updatePreferences({ dailyGoalMinutes: minutes }),
    onSuccess: () => invalidateLearnerData(),
  });
  const current = save.isPending && save.variables ? save.variables : value;
  return (
    <div role="radiogroup" aria-label={t('settings.dailyGoal')} className="grid grid-cols-3 gap-2 sm:grid-cols-5">
      {DAILY_GOAL_MINUTES.map((m) => (
        <button
          key={m}
          type="button"
          role="radio"
          aria-checked={current === m}
          onClick={() => save.mutate(m)}
          className={cn(
            'min-h-[49px] rounded-md border border-line bg-paper text-sm font-bold',
            current === m && 'border-green bg-green text-paper',
          )}
        >
          {t('common.minutes', { count: m })}
        </button>
      ))}
      {save.isError ? (
        <p role="alert" className="col-span-full text-sm text-retry-ink">
          {t('common.error')}
        </p>
      ) : null}
    </div>
  );
}

function GradeForm({ grade: initialGrade, stream: initialStream }: { grade: GradeLevel; stream: Stream | null }) {
  const { t, tOr } = useI18n();
  const { api, queries, invalidateLearnerData } = useMatriq();
  const options = useQuery(queries.onboardingOptions());
  const [grade, setGrade] = useState<GradeLevel>(initialGrade);
  const [stream, setStream] = useState<Stream | null>(initialStream);
  const effectiveStream = needsStream(grade) ? stream : null;
  const save = useMutation({
    mutationFn: () => api.updateProfile({ gradeLevel: grade, stream: effectiveStream }),
    onSuccess: () => invalidateLearnerData(),
  });
  const dirty = grade !== initialGrade || effectiveStream !== initialStream;
  const valid = !needsStream(grade) || effectiveStream !== null;

  return (
    <div>
      <div role="radiogroup" aria-label={t('chooseGrade')} className="mb-5 grid grid-cols-4 gap-2">
        {(options.data?.gradeLevels ?? [9, 10, 11, 12]).map((g) => (
          <button
            key={g}
            type="button"
            role="radio"
            aria-checked={grade === g}
            onClick={() => setGrade(g)}
            className={cn('h-[49px] rounded-md border border-line bg-paper font-bold', grade === g && 'border-green bg-green text-paper')}
          >
            {g}
          </button>
        ))}
      </div>
      {needsStream(grade) ? (
        <div role="radiogroup" aria-label={t('onboarding.streamTitle')} className="mb-2">
          {(options.data?.streams ?? []).map((s) => (
            <SheetOption key={s.slug} selected={stream === s.slug} onClick={() => setStream(s.slug)}>
              {tOr(`stream.${s.slug}`, s.name)}
            </SheetOption>
          ))}
        </div>
      ) : null}
      <div className="flex items-center gap-3">
        <Button block={false} className="px-7" disabled={!dirty || !valid || save.isPending} onClick={() => save.mutate()}>
          {t('common.save')}
        </Button>
        <span role="status" className="text-sm font-bold text-green-dark">
          {save.isSuccess && !dirty ? t('settings.saved') : ''}
        </span>
        {save.isError ? <span role="alert" className="text-sm text-retry-ink">{t('common.error')}</span> : null}
      </div>
    </div>
  );
}

function AccountSection() {
  const { t } = useI18n();
  const { mode, demoApi } = useApiContext();
  const { invalidateLearnerData } = useMatriq();
  const leave = useLeave();
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (mode === 'demo') {
    return (
      <div className="flex flex-col gap-3">
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <Tag tone="green">{t('demo.badge')}</Tag>
          {t('demo.note')}
        </p>
        {isSupabaseConfigured ? (
          <Button variant="secondary" onClick={() => void leave()}>
            {t('demo.createAccount')}
          </Button>
        ) : null}
        <Button variant="secondary" onClick={() => setConfirmOpen(true)}>
          <RotateCcw className="size-[17px]" aria-hidden="true" />
          {t('reset')}
        </Button>
        <Button variant="quiet" onClick={() => void leave()}>
          <LogOut className="size-[17px]" aria-hidden="true" />
          {t('demo.exit')}
        </Button>
        <Sheet open={confirmOpen} onOpenChange={setConfirmOpen} title={t('reset')} description={t('resetConfirm')}>
          <div className="grid grid-cols-2 gap-3">
            <Dialog.Close asChild>
              <Button variant="secondary">{t('cancel')}</Button>
            </Dialog.Close>
            <Button
              onClick={async () => {
                await demoApi?.reset();
                await invalidateLearnerData();
                setConfirmOpen(false);
              }}
            >
              {t('reset')}
            </Button>
          </div>
        </Sheet>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Button variant="secondary" onClick={() => void leave()}>
        <LogOut className="size-[17px]" aria-hidden="true" />
        {t('auth.signOut')}
      </Button>
      <div className="rounded-lg border border-dashed border-line p-4">
        <div className="flex items-center gap-2">
          <Trash2 className="size-[17px] text-muted" aria-hidden="true" />
          <strong className="text-sm">{t('settings.deleteAccount')}</strong>
          <Tag>{t('comingSoon')}</Tag>
        </div>
        <p className="mt-1.5 text-sm text-muted">{t('settings.deleteSoon')}</p>
      </div>
    </div>
  );
}

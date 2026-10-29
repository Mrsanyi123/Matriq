'use client';

import type { PracticeSessionResult } from '@matriq/validation';
import { ArrowRight, BookOpen, Trophy } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { achievementIcon } from '../icons';
import { Button, ButtonLink } from '../ui/button';
import { SampleNotice } from '../ui/primitives';

/** Prototype results screen: reward mark, score, XP, new badges, next steps. */
export function ResultsView({
  result,
  xpGained,
  chapterSlug,
  isDemo,
  onRetry,
}: {
  result: PracticeSessionResult;
  xpGained: number;
  chapterSlug: string;
  isDemo: boolean;
  onRetry: () => void;
}) {
  const { t, tOr } = useI18n();
  const Mark = result.passed ? Trophy : BookOpen;

  return (
    <section aria-labelledby="results-title" data-testid="results">
      <div className="px-2 pt-[30px] pb-5 text-center">
        <div
          aria-hidden="true"
          className="mx-auto mb-[25px] grid size-[108px] -rotate-7 place-items-center rounded-frame bg-reward-bg text-reward-ink shadow-ledge-reward"
        >
          <Mark className="size-[57px] rotate-7" strokeWidth={1.9} />
        </div>
        <h1 id="results-title" tabIndex={-1} className="text-[29px] font-extrabold focus:outline-none">
          {result.passed ? t('goodDone') : t('reviewNeeded')}
        </h1>
        <p className="mt-3 text-sm text-muted">{result.passed ? t('progressSub') : t('tryAgain')}</p>
        {!result.passed ? <p className="mt-1 text-xs text-muted">{t('reviewHint')}</p> : null}
      </div>

      <div className="mt-5 mb-[26px] grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-line bg-paper px-2 py-5 text-center">
          <b className="block text-[26px] font-extrabold" data-testid="result-score">
            {result.correct}/{result.total}
          </b>
          <small className="text-caption font-normal text-muted">{t('correctShort')}</small>
        </div>
        <div className="rounded-lg border border-line bg-paper px-2 py-5 text-center">
          <b className="block text-[26px] font-extrabold" data-testid="result-xp">
            +{xpGained}
          </b>
          <small className="text-caption font-normal text-muted">{t('results.xpGained')}</small>
        </div>
      </div>

      {result.newAchievements.map((a) => {
        const Icon = achievementIcon(a.iconKey);
        return (
          <div key={a.slug} className="mb-[26px] flex items-center gap-3.5 rounded-lg bg-example-bg p-[18px]">
            <span className="grid size-[46px] shrink-0 place-items-center rounded-lg bg-badge-earned-bg text-badge-earned-ink" aria-hidden="true">
              <Icon className="size-[26px]" strokeWidth={1.9} />
            </span>
            <div>
              <small className="text-eyebrow uppercase text-green-dark">{t('results.newBadge')}</small>
              <strong className="block text-sm">{tOr(`achievement.${a.slug}.title`, a.title)}</strong>
              <small className="text-xs text-muted">{tOr(`achievement.${a.slug}.description`, a.description)}</small>
            </div>
          </div>
        );
      })}

      <ButtonLink href="/learn">
        {t('returnMap')}
        <ArrowRight className="size-[17px]" aria-hidden="true" />
      </ButtonLink>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Button variant="text" block={false} onClick={onRetry}>
          {t('retry')}
        </Button>
        <ButtonLink variant="text" block={false} href={`/learn/${chapterSlug}`}>
          {t('review')}
        </ButtonLink>
      </div>
      {isDemo ? <SampleNotice>{t('saved')}</SampleNotice> : null}
    </section>
  );
}

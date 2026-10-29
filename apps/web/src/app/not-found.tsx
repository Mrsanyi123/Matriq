'use client';

import { Brand } from '@/components/brand';
import { ButtonLink } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';

export default function NotFound() {
  const { t } = useI18n();
  return (
    <main id="main" className="grid min-h-dvh place-items-center px-6 text-center">
      <div className="flex max-w-sm flex-col items-center gap-4">
        <Brand />
        <h1 className="text-title">{t('error.pageNotFound')}</h1>
        <p className="text-sm text-muted">{t('error.pageNotFoundBody')}</p>
        <ButtonLink href="/home" block={false} className="px-7">
          {t('nav.home')}
        </ButtonLink>
      </div>
    </main>
  );
}

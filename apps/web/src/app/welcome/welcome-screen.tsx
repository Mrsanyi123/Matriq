'use client';

import { ArrowRight, Info, Leaf, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { z } from 'zod';
import { Brand } from '@/components/brand';
import { LanguageButton } from '@/components/language';
import { Button } from '@/components/ui/button';
import { SampleNotice } from '@/components/ui/primitives';
import { useApiContext } from '@/lib/api';
import { isSupabaseConfigured } from '@/lib/env';
import { useI18n } from '@/lib/i18n';
import { getBrowserSupabase } from '@/lib/supabase/browser';

const EmailSchema = z.email();
const inputClass =
  'h-[53px] w-full rounded-md border border-line bg-paper px-4 text-base text-ink placeholder:text-muted aria-[invalid=true]:border-wrong-border';

export function WelcomeScreen() {
  const { t } = useI18n();
  const { enterDemo } = useApiContext();
  const router = useRouter();
  const [startingDemo, setStartingDemo] = useState(false);

  async function startDemo() {
    setStartingDemo(true);
    const demo = enterDemo();
    let onboarded = false;
    try {
      onboarded = (await demo.getProfile()).onboarded;
    } catch {
      // Storage problems fall back to a fresh demo.
    }
    router.push(onboarded ? '/home' : '/onboarding');
  }

  return (
    <div className="min-h-dvh bg-canvas md:grid md:place-items-center md:p-8">
      <div className="relative mx-auto flex min-h-dvh w-full max-w-[460px] flex-col bg-bg px-[22px] pt-[max(12px,env(safe-area-inset-top))] pb-8 md:min-h-0 md:rounded-frame md:border-8 md:border-paper md:px-9 md:pt-6 md:pb-9 md:shadow-floating">
        <header className="flex h-topbar items-center justify-between">
          <Brand />
          <LanguageButton persist={false} />
        </header>

        <main id="main" className="flex flex-1 flex-col">
          <div className="mt-6 mb-7 flex items-end gap-3" aria-hidden="true">
            {(['nodeDone', 'nodeCurrent', 'nodeIdle'] as const).map((tone, i) => (
              <span
                key={tone}
                className={
                  tone === 'nodeCurrent'
                    ? 'grid size-[58px] place-items-center rounded-node border-4 border-bg bg-node-current text-paper shadow-ledge-node-current'
                    : tone === 'nodeDone'
                      ? 'grid size-[46px] place-items-center rounded-lg border-4 border-bg bg-node-done text-node-done-ink shadow-ledge-node-done'
                      : 'grid size-[46px] place-items-center rounded-lg border-4 border-bg bg-node-idle text-node-idle-ink shadow-ledge-node-idle'
                }
                style={{ marginBottom: i === 1 ? 14 : 0 }}
              >
                <Leaf className={i === 1 ? 'size-6' : 'size-5'} strokeWidth={1.9} />
              </span>
            ))}
          </div>

          <h1 className="text-display">{t('auth.title')}</h1>
          <p className="mt-[7px] text-sm text-muted">{t('auth.subtitle')}</p>

          <div className="mt-8">
            {isSupabaseConfigured ? (
              <EmailSignIn />
            ) : (
              <p className="flex gap-3 rounded-lg border border-line bg-paper p-4 text-sm text-muted" role="note">
                <Info className="mt-0.5 size-[18px] shrink-0 text-green" aria-hidden="true" />
                {t('auth.notConfigured')}
              </p>
            )}
          </div>

          {isSupabaseConfigured ? (
            <div className="my-6 flex items-center gap-3 text-xs text-muted" aria-hidden="true">
              <span className="h-px flex-1 bg-line" />
              {t('auth.or')}
              <span className="h-px flex-1 bg-line" />
            </div>
          ) : (
            <div className="h-5" />
          )}

          <Button
            variant={isSupabaseConfigured ? 'secondary' : 'primary'}
            onClick={() => void startDemo()}
            disabled={startingDemo}
            data-testid="try-demo"
          >
            {t('auth.tryDemo')}
            <ArrowRight className="size-[17px]" aria-hidden="true" />
          </Button>
          <p className="mt-3 text-center text-xs text-muted">{t('auth.demoHint')}</p>

          <div className="mt-auto pt-8">
            <SampleNotice>{t('sampleShort')}</SampleNotice>
          </div>
        </main>
      </div>
    </div>
  );
}

function EmailSignIn() {
  const { t } = useI18n();
  const { enterAccount } = useApiContext();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    const parsed = EmailSchema.safeParse(email.trim());
    if (!parsed.success) {
      setError(t('auth.invalidEmail'));
      return;
    }
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    const { error: sendError } = await supabase.auth.signInWithOtp({
      email: parsed.data,
      options: { shouldCreateUser: true },
    });
    setBusy(false);
    if (sendError) setError(t('auth.sendFailed'));
    else setStep('code');
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'email',
    });
    setBusy(false);
    if (verifyError) {
      setError(t('auth.invalidCode'));
      return;
    }
    enterAccount();
    router.replace('/home');
    router.refresh();
  }

  if (step === 'code') {
    return (
      <form onSubmit={verify} noValidate>
        <p className="mb-4 text-sm text-muted" role="status">
          {t('auth.checkEmail', { email: email.trim() })}
        </p>
        <label htmlFor="otp" className="mb-2 block text-sm font-bold">
          {t('auth.code')}
        </label>
        <input
          id="otp"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={10}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          aria-invalid={Boolean(error)}
          aria-describedby="otp-help"
          className={`${inputClass} text-center text-xl font-bold tracking-[0.4em]`}
        />
        <p id="otp-help" className="mt-1.5 min-h-5 text-sm">
          {error ? <span role="alert" className="text-retry-ink">{error}</span> : <span className="text-muted">{t('auth.codeHint')}</span>}
        </p>
        <Button type="submit" className="mt-3" disabled={busy || code.length < 6}>
          {t('auth.verify')}
          <ArrowRight className="size-[17px]" aria-hidden="true" />
        </Button>
        <Button
          variant="text"
          block={false}
          className="mx-auto mt-2 flex"
          onClick={() => {
            setStep('email');
            setCode('');
            setError(null);
          }}
        >
          {t('auth.changeEmail')}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={sendCode} noValidate>
      <label htmlFor="email" className="mb-2 block text-sm font-bold">
        {t('auth.email')}
      </label>
      <div className="relative">
        <Mail className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-node-idle-ink" aria-hidden="true" />
        <input
          id="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'email-error' : undefined}
          className={`${inputClass} pl-11`}
        />
      </div>
      <p id="email-error" role={error ? 'alert' : undefined} className="mt-1.5 min-h-5 text-sm text-retry-ink">
        {error}
      </p>
      <Button type="submit" className="mt-2" disabled={busy}>
        {t('auth.sendLink')}
        <ArrowRight className="size-[17px]" aria-hidden="true" />
      </Button>
    </form>
  );
}

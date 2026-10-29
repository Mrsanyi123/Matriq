import { palette, radius, space } from '@matriq/ui';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../components/AppText';
import { LanguageButton } from '../components/Bars';
import { BrandMark } from '../components/Brand';
import { Button, TextButton } from '../components/Button';
import { Field } from '../components/Field';
import { Icon } from '../components/Icon';
import { OfflineBanner } from '../components/Screen';
import { useI18n } from '../i18n/I18nProvider';
import type { AppMessageKey } from '../i18n/translate';
import { useSession } from '../lib/session';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CODE = /^\d{6}$/;

function authErrorKey(error: unknown, step: 'email' | 'code'): AppMessageKey {
  const e = error as { status?: number; code?: string } | null;
  if (e?.status === 429 || e?.code?.includes('rate_limit')) return 'auth.rateLimited';
  if (step === 'code') return 'auth.invalidCode';
  if (e?.code === 'email_address_invalid' || e?.code === 'validation_failed') return 'auth.invalidEmail';
  return 'common.error';
}

export function WelcomeScreen() {
  const { t } = useI18n();
  const session = useSession();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<AppMessageKey | null>(null);
  const [busy, setBusy] = useState(false);

  async function send() {
    const trimmed = email.trim().toLowerCase();
    if (!EMAIL.test(trimmed)) {
      setError('auth.invalidEmail');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await session.requestCode(trimmed);
      setEmail(trimmed);
      setStep('code');
    } catch (e) {
      setError(authErrorKey(e, 'email'));
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    if (!CODE.test(code.trim())) {
      setError('auth.codeHint');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await session.verifyCode(email, code.trim());
    } catch (e) {
      setError(authErrorKey(e, 'code'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} testID="welcome-screen">
      <View style={styles.top}>
        <LanguageButton />
      </View>
      <OfflineBanner />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <BrandMark scale={1.8} />
            <AppText variant="display" align="center" accessibilityRole="header" style={styles.title}>
              {t('auth.title')}
            </AppText>
            <AppText size={15} weight="400" color={palette.muted} align="center">
              {t('auth.subtitle')}
            </AppText>
          </View>

          {session.accountsAvailable ? (
            <View style={styles.form}>
              {step === 'email' ? (
                <>
                  <Field
                    testID="email-input"
                    label={t('auth.email')}
                    value={email}
                    onChangeText={(v) => {
                      setEmail(v);
                      setError(null);
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    textContentType="emailAddress"
                    returnKeyType="send"
                    onSubmitEditing={() => void send()}
                    error={error ? t(error) : null}
                  />
                  <Button testID="send-code" label={t('auth.sendLink')} onPress={() => void send()} loading={busy} />
                </>
              ) : (
                <>
                  <View style={styles.sent} accessibilityLiveRegion="polite">
                    <Icon name="Mail" size={18} color={palette.green} />
                    <AppText variant="small" weight="600" style={styles.flex}>
                      {t('auth.checkEmail', { email })}
                    </AppText>
                  </View>
                  <Field
                    testID="code-input"
                    label={t('auth.code')}
                    value={code}
                    onChangeText={(v) => {
                      setCode(v.replace(/\D/g, '').slice(0, 6));
                      setError(null);
                    }}
                    keyboardType="number-pad"
                    autoComplete="one-time-code"
                    textContentType="oneTimeCode"
                    maxLength={6}
                    returnKeyType="done"
                    onSubmitEditing={() => void verify()}
                    hint={t('auth.codeHint')}
                    error={error ? t(error) : null}
                  />
                  <Button testID="verify-code" label={t('auth.verify')} onPress={() => void verify()} loading={busy} />
                  <View style={styles.row}>
                    <TextButton
                      label={t('auth.changeEmail')}
                      color={palette.muted}
                      onPress={() => {
                        setStep('email');
                        setCode('');
                        setError(null);
                      }}
                    />
                    <TextButton label={t('auth.resend')} onPress={() => void send()} disabled={busy} />
                  </View>
                </>
              )}
              <View style={styles.or}>
                <View style={styles.line} />
                <AppText size={12} weight="600" color={palette.muted}>
                  {t('auth.or')}
                </AppText>
                <View style={styles.line} />
              </View>
            </View>
          ) : (
            <View style={styles.notice} testID="accounts-not-configured">
              <AppText variant="small" weight="600" color={palette.offlineInk} align="center">
                {t('auth.notConfigured')}
              </AppText>
            </View>
          )}

          <Button
            testID="try-demo"
            label={t('auth.tryDemo')}
            variant={session.accountsAvailable ? 'secondary' : 'primary'}
            leadingIcon="Leaf"
            icon={session.accountsAvailable ? null : 'ArrowRight'}
            onPress={() => void session.startDemo()}
          />
          <AppText variant="caption" weight="400" color={palette.muted} align="center" style={styles.demoHint}>
            {t('auth.demoHint')}
          </AppText>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg },
  flex: { flex: 1 },
  top: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: space.gutter, paddingTop: space[3] },
  page: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: space.gutter, paddingBottom: space[8] },
  hero: { alignItems: 'center', gap: space[2], marginBottom: space[8] },
  title: { marginTop: space[5] },
  form: { gap: space[4] },
  sent: {
    flexDirection: 'row',
    gap: space[3],
    alignItems: 'center',
    padding: space[4],
    borderRadius: radius.lg,
    backgroundColor: palette.soft,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap' },
  or: { flexDirection: 'row', alignItems: 'center', gap: space[3], marginVertical: space[2] },
  line: { flex: 1, height: 1, backgroundColor: palette.line },
  notice: {
    padding: space[4],
    borderRadius: radius.lg,
    backgroundColor: palette.offlineBg,
    marginBottom: space[5],
  },
  demoHint: { marginTop: space[3] },
});

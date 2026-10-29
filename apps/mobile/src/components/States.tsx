import { isMatriqApiError } from '@matriq/api-client';
import { palette, radius, space } from '@matriq/ui';
import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useI18n } from '../i18n/I18nProvider';
import type { AppMessageKey } from '../i18n/translate';
import { useIsOnline } from '../lib/hooks';
import { AppText } from './AppText';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';

export function LoadingState({ testID = 'loading' }: { testID?: string }) {
  const { t } = useI18n();
  return (
    <View
      style={styles.center}
      testID={testID}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t('common.loading')}
    >
      <ActivityIndicator color={palette.green} size="large" />
    </View>
  );
}

/** Message key for an error from the API or the network. */
export function errorMessageKey(error: unknown, online: boolean): AppMessageKey {
  if (!online) return 'offline.needsConnection';
  if (isMatriqApiError(error)) {
    if (error.code === 'not_configured') return 'gate.accountUnavailable';
    if (error.code === 'network') return 'offline.needsConnection';
  }
  return 'common.error';
}

export function ErrorState({
  error,
  onRetry,
  testID = 'error',
}: {
  error: unknown;
  onRetry?: () => void;
  testID?: string;
}) {
  const { t } = useI18n();
  const online = useIsOnline();
  return (
    <View style={styles.center} testID={testID}>
      <View style={styles.card} accessibilityRole="alert">
        <AppText variant="heading" align="center">
          {t('common.error')}
        </AppText>
        {errorMessageKey(error, online) !== 'common.error' ? (
          <AppText variant="small" weight="400" color={palette.muted} align="center">
            {t(errorMessageKey(error, online))}
          </AppText>
        ) : null}
        {onRetry ? (
          <Button
            label={t('common.retry')}
            variant="secondary"
            icon="RotateCcw"
            onPress={onRetry}
            style={styles.retry}
          />
        ) : null}
      </View>
    </View>
  );
}

export function EmptyState({
  icon = 'Leaf',
  title,
  body,
  children,
}: {
  icon?: IconName;
  title: string;
  body?: string;
  children?: ReactNode;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Icon name={icon} size={28} color={palette.rewardInk} />
      </View>
      <AppText variant="heading" align="center">
        {title}
      </AppText>
      {body ? (
        <AppText variant="small" weight="400" color={palette.muted} align="center">
          {body}
        </AppText>
      ) : null}
      {children}
    </View>
  );
}

/** "Sample content. Not official exam material." */
export function DemoNotice({ text }: { text?: string }) {
  const { t } = useI18n();
  return (
    <AppText size={10} lineHeight={16} weight="600" color={palette.label} align="center" style={styles.notice}>
      {text ?? t('sampleShort')}
    </AppText>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.gutter, minHeight: 240 },
  card: {
    alignSelf: 'stretch',
    gap: space[3],
    padding: space[5],
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.paper,
  },
  retry: { marginTop: space[2] },
  empty: {
    alignItems: 'center',
    gap: space[2],
    paddingVertical: space[6],
    paddingHorizontal: space[4],
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: palette.rewardBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space[2],
  },
  notice: { marginTop: space.gutter, marginHorizontal: 7 },
});

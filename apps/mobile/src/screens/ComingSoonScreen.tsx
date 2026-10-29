import { palette, radius, space } from '@matriq/ui';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { AppText } from '../components/AppText';
import { SubBar, TopBar } from '../components/Bars';
import { Button } from '../components/Button';
import { Icon, type IconName } from '../components/Icon';
import { Screen } from '../components/Screen';
import { useI18n } from '../i18n/I18nProvider';
import type { AppMessageKey } from '../i18n/translate';

/**
 * Honest placeholder for features that are not built yet (Library, AI Tutor,
 * Revision). Nothing here pretends to work.
 */
export function ComingSoonScreen({
  titleKey,
  bodyKey,
  icon,
  ai = false,
  tab = false,
}: {
  titleKey: AppMessageKey;
  bodyKey: AppMessageKey;
  icon: IconName;
  /** AI features use the lavender family (the only place it appears). */
  ai?: boolean;
  tab?: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const tint = ai ? palette.aiInk : palette.greenDark;
  return (
    <Screen
      tab={tab}
      testID="coming-soon"
      header={
        tab ? (
          <TopBar />
        ) : (
          <SubBar title={t(titleKey)} onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        )
      }
    >
      <AppText variant="display" accessibilityRole="header" style={styles.title}>
        {t(titleKey)}
      </AppText>
      <View style={[styles.card, ai ? styles.cardAi : null]}>
        <View style={[styles.mark, ai ? styles.markAi : null]}>
          <Icon name={icon} size={30} color={tint} />
        </View>
        <View style={[styles.tag, ai ? styles.tagAi : null]}>
          <AppText size={10} weight="800" color={tint} uppercase>
            {t('comingSoon')}
          </AppText>
        </View>
        <AppText variant="body" align="center" color={palette.ink}>
          {t(bodyKey)}
        </AppText>
        <AppText variant="small" weight="400" align="center" color={palette.muted}>
          {t('comingSoon.body')}
        </AppText>
      </View>
      <Button label={t('nav.learn')} variant="secondary" onPress={() => router.navigate('/learn')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: space[3] },
  card: {
    alignItems: 'center',
    gap: space[3],
    padding: space[6],
    marginVertical: space[6],
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.paper,
  },
  cardAi: { backgroundColor: palette.tutorBg, borderColor: palette.tutorBorder },
  mark: {
    width: 72,
    height: 72,
    borderRadius: radius.xl + 2,
    backgroundColor: palette.soft,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-7deg' }],
  },
  markAi: { backgroundColor: palette.aiBg },
  tag: {
    borderRadius: radius.xs,
    paddingHorizontal: space[2],
    paddingVertical: 3,
    backgroundColor: palette.soft,
  },
  tagAi: { backgroundColor: palette.aiBg },
});

import { useRouter } from 'expo-router';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { EmptyState } from '../components/States';
import { useI18n } from '../i18n/I18nProvider';

export default function NotFound() {
  const { t } = useI18n();
  const router = useRouter();
  return (
    <Screen>
      <EmptyState title={t('m.notFound')}>
        <Button label={t('m.goHome')} onPress={() => router.replace('/')} />
      </EmptyState>
    </Screen>
  );
}

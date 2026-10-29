import { LANGUAGE_OPTIONS } from '@matriq/i18n';
import { palette, space } from '@matriq/ui';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useI18n } from '../i18n/I18nProvider';
import { AppText } from './AppText';
import { BottomSheet, SheetOption } from './BottomSheet';

/** The app-wide language sheet, opened from any language button. */
export function LanguageSheet() {
  const { t, language, setLanguage, languageSheetOpen, closeLanguageSheet } = useI18n();
  const [failed, setFailed] = useState(false);
  return (
    <BottomSheet
      visible={languageSheetOpen}
      title={t('appLanguage')}
      description={t('englishOnly')}
      onClose={closeLanguageSheet}
      testID="language-sheet"
    >
      {LANGUAGE_OPTIONS.map((option) => (
        <SheetOption
          key={option.code}
          testID={`language-${option.code}`}
          label={option.nativeName}
          sublabel={option.englishName}
          selected={language === option.code}
          onPress={() => {
            setFailed(false);
            setLanguage(option.code)
              .then(closeLanguageSheet)
              .catch(() => setFailed(true));
          }}
        />
      ))}
      {failed ? (
        <AppText variant="small" weight="600" color={palette.retryInk} style={styles.error}>
          {t('common.error')}
        </AppText>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({ error: { marginTop: space[1] } });

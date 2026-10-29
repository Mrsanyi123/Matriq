import { palette, radius, space, typography } from '@matriq/ui';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { fontFamily } from '../theme/fonts';
import { AppText } from './AppText';

export interface FieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string | null;
  hint?: string;
}

/** Labelled text input (53px, radius 14) with an error line. */
export function Field({ label, error, hint, ...input }: FieldProps) {
  return (
    <View style={styles.wrap}>
      <AppText variant="small" weight="700" nativeID={`${label}-label`}>
        {label}
      </AppText>
      <TextInput
        accessibilityLabel={label}
        accessibilityLabelledBy={`${label}-label`}
        placeholderTextColor={palette.nodeIdleInk}
        maxFontSizeMultiplier={1.6}
        {...input}
        style={[styles.input, error ? styles.inputError : null]}
      />
      {error ? (
        <AppText variant="small" weight="600" color={palette.retryInk} accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" weight="400" color={palette.muted}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  input: {
    minHeight: 53,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.paper,
    paddingHorizontal: space[4],
    fontFamily: fontFamily('600'),
    fontSize: typography.body.size,
    color: palette.ink,
  },
  inputError: { borderColor: palette.wrongBorder },
});

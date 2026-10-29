import { palette, typography } from '@matriq/ui';
import { Children, type ReactNode } from 'react';
import { StyleSheet, Text, type StyleProp, type TextProps, type TextStyle } from 'react-native';
import { useI18n } from '../i18n/I18nProvider';
import { containsEthiopic, fontFamily, type FontWeight } from '../theme/fonts';

export type TextVariant = keyof typeof typography;

export interface AppTextProps extends Omit<TextProps, 'style'> {
  variant?: TextVariant;
  weight?: FontWeight;
  color?: string;
  /** Font size override (px) for prototype-specific sizes. */
  size?: number;
  lineHeight?: number;
  uppercase?: boolean;
  align?: TextStyle['textAlign'];
  /**
   * Academic content (lessons, questions, explanations) stays in English even
   * when the interface is Amharic or Afaan Oromoo.
   */
  academic?: boolean;
  style?: StyleProp<TextStyle>;
  children?: ReactNode;
}

function textOf(children: ReactNode): string {
  let out = '';
  Children.forEach(children, (child) => {
    if (typeof child === 'string' || typeof child === 'number') out += String(child);
  });
  return out;
}

/**
 * The only text primitive. Applies the type scale from @matriq/ui, picks the
 * Nunito/Noto Sans Ethiopic family per weight (Android ignores fontWeight for
 * custom fonts) and caps font scaling so layouts survive large system text.
 */
export function AppText({
  variant = 'body',
  weight,
  color = palette.ink,
  size,
  lineHeight,
  uppercase,
  align,
  academic,
  style,
  children,
  maxFontSizeMultiplier,
  ...rest
}: AppTextProps) {
  const { language } = useI18n();
  const token = typography[variant];
  const ethiopic = !academic && (language === 'am' || containsEthiopic(textOf(children)));
  const fontSize = size ?? token.size;
  const resolvedLineHeight =
    lineHeight ?? (size ? Math.round(size * (token.lineHeight / token.size)) : token.lineHeight);
  return (
    <Text
      {...rest}
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? (fontSize <= 12 ? 1.5 : 1.8)}
      {...(academic ? { accessibilityLanguage: 'en' } : null)}
      style={[
        {
          fontFamily: fontFamily((weight ?? token.weight) as FontWeight, ethiopic ? 'ethiopic' : 'latin'),
          fontSize,
          // Ethiopic glyphs are taller; give them a little more room.
          lineHeight: ethiopic ? Math.round(resolvedLineHeight * 1.12) : resolvedLineHeight,
          // Ethiopic script has no case and should not be letter-spaced.
          letterSpacing: ethiopic ? 0 : uppercase ? typography.eyebrow.letterSpacing : token.letterSpacing,
          color,
        },
        uppercase ? styles.upper : null,
        align ? { textAlign: align } : null,
        style,
      ]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  upper: { textTransform: 'uppercase' },
});

// Import each weight from its own entry so only these files are bundled.
import { NotoSansEthiopic_400Regular } from '@expo-google-fonts/noto-sans-ethiopic/400Regular';
import { NotoSansEthiopic_600SemiBold } from '@expo-google-fonts/noto-sans-ethiopic/600SemiBold';
import { NotoSansEthiopic_700Bold } from '@expo-google-fonts/noto-sans-ethiopic/700Bold';
import { NotoSansEthiopic_800ExtraBold } from '@expo-google-fonts/noto-sans-ethiopic/800ExtraBold';
import { Nunito_400Regular } from '@expo-google-fonts/nunito/400Regular';
import { Nunito_600SemiBold } from '@expo-google-fonts/nunito/600SemiBold';
import { Nunito_700Bold } from '@expo-google-fonts/nunito/700Bold';
import { Nunito_800ExtraBold } from '@expo-google-fonts/nunito/800ExtraBold';

/** Font assets loaded at startup (see app/_layout.tsx). */
export const fontAssets = {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  NotoSansEthiopic_400Regular,
  NotoSansEthiopic_600SemiBold,
  NotoSansEthiopic_700Bold,
  NotoSansEthiopic_800ExtraBold,
};

export type FontWeight = '400' | '600' | '700' | '800';

/**
 * React Native on Android ignores `fontWeight` for custom fonts, so each
 * weight is its own family. Ethiopic script uses Noto Sans Ethiopic (which also
 * covers Latin), everything else Nunito.
 */
const FAMILIES: Record<'latin' | 'ethiopic', Record<FontWeight, keyof typeof fontAssets>> = {
  latin: {
    '400': 'Nunito_400Regular',
    '600': 'Nunito_600SemiBold',
    '700': 'Nunito_700Bold',
    '800': 'Nunito_800ExtraBold',
  },
  ethiopic: {
    '400': 'NotoSansEthiopic_400Regular',
    '600': 'NotoSansEthiopic_600SemiBold',
    '700': 'NotoSansEthiopic_700Bold',
    '800': 'NotoSansEthiopic_800ExtraBold',
  },
};

export function fontFamily(weight: FontWeight, script: 'latin' | 'ethiopic' = 'latin'): string {
  return FAMILIES[script][weight];
}

const ETHIOPIC = /[ሀ-᎟ⶀ-⷟꬀-꬯]/;

export function containsEthiopic(text: string): boolean {
  return ETHIOPIC.test(text);
}

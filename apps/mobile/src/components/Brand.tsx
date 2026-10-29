import { palette } from '@matriq/ui';
import { StyleSheet, View } from 'react-native';
import { AppText } from './AppText';
import { Icon } from './Icon';

/** Leaf in a rotated green blob + "matriq" wordmark + lime dot. */
export function Brand({ size = 26 }: { size?: number }) {
  return (
    <View style={styles.row} accessible accessibilityRole="header" accessibilityLabel="Matriq">
      <BrandMark />
      <View style={styles.word}>
        <AppText size={size} lineHeight={size + 6} weight="800" style={styles.wordmark}>
          matriq
        </AppText>
        <AppText size={size} lineHeight={size + 6} weight="800" color={palette.progressFill}>
          .
        </AppText>
      </View>
    </View>
  );
}

export function BrandMark({ scale = 1 }: { scale?: number }) {
  return (
    <View
      style={[
        styles.mark,
        {
          width: 31 * scale,
          height: 34 * scale,
          borderTopLeftRadius: 11 * scale,
          borderTopRightRadius: 11 * scale,
          borderBottomRightRadius: 14 * scale,
          borderBottomLeftRadius: 4 * scale,
        },
      ]}
    >
      <View style={styles.counter}>
        <Icon name="Leaf" size={22 * scale} color={palette.paper} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48 },
  word: { flexDirection: 'row', alignItems: 'baseline' },
  wordmark: { letterSpacing: -1.5 },
  mark: {
    backgroundColor: palette.green,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-8deg' }],
  },
  counter: { transform: [{ rotate: '8deg' }] },
});

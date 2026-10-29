import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

export interface LedgeProps {
  /** Ledge colour and depth, e.g. `ledge.primary` from @matriq/ui. */
  ledge: { offsetY: number; color: string };
  radius: number;
  /** Pressed: the face sinks onto the ledge (prototype: translate 3px). */
  pressed?: boolean;
  style?: StyleProp<ViewStyle>;
  faceStyle?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

/**
 * The tactile "ledge" shadow (`box-shadow: 0 Npx 0 <colour>`): a solid copy of
 * the shape sits N px below the face. Implemented with views rather than
 * platform shadows so it looks identical on Android, iOS and web.
 */
export function Ledge({ ledge, radius, pressed, style, faceStyle, children }: LedgeProps) {
  const sink = pressed ? Math.min(3, Math.max(0, ledge.offsetY - 1)) : 0;
  return (
    <View style={[{ paddingBottom: ledge.offsetY }, style]}>
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { top: ledge.offsetY, bottom: 0, borderRadius: radius, backgroundColor: ledge.color },
        ]}
      />
      <View style={[{ borderRadius: radius, transform: [{ translateY: sink }] }, faceStyle]}>
        {children}
      </View>
    </View>
  );
}

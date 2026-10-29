import type { FunctionPlotData } from '@matriq/validation';
import { palette, radius, space } from '@matriq/ui';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';
import { useI18n } from '../i18n/I18nProvider';
import { fontFamily } from '../theme/fonts';
import { AppText } from './AppText';

const W = 280;
const H = 190;
const LEFT = 36;
const BOTTOM = 172;
const PLOT = { x0: 36, x1: 236, y0: 160, y1: 24 };

/** Maps data coordinates into the prototype's 280×190 viewBox. */
export function plotScale(points: readonly (readonly [number, number])[]) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const xMin = Math.min(0, ...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(0, ...ys);
  const yMax = Math.max(...ys);
  const sx = (x: number) => PLOT.x0 + ((x - xMin) / (xMax - xMin || 1)) * (PLOT.x1 - PLOT.x0);
  const sy = (y: number) => PLOT.y0 - ((y - yMin) / (yMax - yMin || 1)) * (PLOT.y0 - PLOT.y1);
  return { sx, sy };
}

/** Function plot figure: SVG line graph plus the same points as a table. */
export function FunctionPlot({ data, title, caption }: { data: FunctionPlotData; title: string | null; caption?: string }) {
  const { t } = useI18n();
  const { sx, sy } = plotScale(data.points);
  const line = data.points.map(([x, y], i) => `${i ? 'L' : 'M'}${sx(x)} ${sy(y)}`).join(' ');
  const summary = `${data.rule}: ${data.points.map(([x, y]) => `(${x}, ${y})`).join(', ')}`;
  return (
    <View style={styles.figure} testID="function-plot">
      <AppText academic size={13} weight="700" style={styles.title}>
        {title ?? data.rule}
      </AppText>
      <View accessible accessibilityRole="image" accessibilityLabel={summary} accessibilityLanguage="en">
        <Svg viewBox={`0 0 ${W} ${H}`} width="100%" height={190} style={styles.svg}>
          <G stroke={palette.line} strokeWidth={1}>
            {data.points.map(([x, y]) => (
              <G key={`${x},${y}`}>
                <Line x1={sx(x)} y1={12} x2={sx(x)} y2={BOTTOM} />
                <Line x1={LEFT} y1={sy(y)} x2={263} y2={sy(y)} />
              </G>
            ))}
          </G>
          <Path d={`M${LEFT} 6V${BOTTOM}H266`} fill="none" stroke={palette.nodeIdleLedge} strokeWidth={2} />
          <Path d={line} fill="none" stroke={palette.nodeCurrent} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
          {data.points.map(([x, y]) => (
            <Circle key={`c${x},${y}`} cx={sx(x)} cy={sy(y)} r={5} fill={palette.paper} stroke={palette.green} strokeWidth={3} />
          ))}
          <G fill={palette.muted} fontSize={11} fontFamily={fontFamily('600')}>
            {data.points.map(([x]) => (
              <SvgText key={`x${x}`} x={sx(x)} y={185} textAnchor="middle">
                {String(x)}
              </SvgText>
            ))}
            {data.points.map(([, y]) => (
              <SvgText key={`y${y}`} x={24} y={sy(y) + 4} textAnchor="end">
                {String(y)}
              </SvgText>
            ))}
            <SvgText x={270} y={184}>
              x
            </SvgText>
            <SvgText x={22} y={12}>
              y
            </SvgText>
          </G>
        </Svg>
      </View>
      <View style={styles.table} accessibilityLanguage="en">
        <View style={styles.row}>
          <AppText academic size={12} weight="700" style={styles.cell}>
            {t('lesson.input')}
          </AppText>
          <AppText academic size={12} weight="700" style={styles.cell}>
            {t('lesson.output')}
          </AppText>
        </View>
        {data.points.map(([x, y]) => (
          <View key={`r${x}`} style={styles.row}>
            <AppText academic size={12} weight="400" style={styles.cell}>
              {String(x)}
            </AppText>
            <AppText academic size={12} weight="400" style={styles.cell}>
              {String(y)}
            </AppText>
          </View>
        ))}
      </View>
      {caption ?? data.caption ? (
        <AppText academic size={11} weight="400" color={palette.muted} align="center" style={styles.caption}>
          {caption ?? data.caption}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  figure: {
    paddingVertical: 17,
    paddingHorizontal: space[3],
    backgroundColor: palette.paper,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radius.lg,
    marginVertical: 23,
  },
  title: { paddingHorizontal: 7, marginBottom: space[3] },
  svg: { maxHeight: 190 },
  table: { marginTop: 15 },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: palette.line },
  cell: { flex: 1, textAlign: 'center', paddingVertical: 6 },
  caption: { marginTop: space[3] },
});

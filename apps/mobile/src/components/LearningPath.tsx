import type { ChapterNode } from '@matriq/validation';
import { ledge, palette, PATH_NODE_ICONS, radius } from '@matriq/ui';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useI18n } from '../i18n/I18nProvider';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

export type PathNodeState = 'idle' | 'current' | 'complete';

const NODE = 68;
const INDENT = 51; // prototype: odd stops sit at left 64px vs 13px
const ROW_MIN = 90;
const ROW_GAP = 14;

const NODE_STYLES = {
  idle: { bg: palette.nodeIdle, ink: palette.nodeIdleInk, ledge: ledge.nodeIdle },
  current: { bg: palette.nodeCurrent, ink: palette.paper, ledge: ledge.nodeCurrent },
  complete: { bg: palette.nodeDone, ink: palette.nodeDoneInk, ledge: ledge.nodeDone },
} as const;

export function nodeState(chapter: ChapterNode, currentChapterId: string | null): PathNodeState {
  if (chapter.status === 'completed') return 'complete';
  if (chapter.id === currentChapterId) return 'current';
  return 'idle';
}

export function nodeIcon(index: number, state: PathNodeState): IconName {
  if (state === 'complete') return 'Check';
  return PATH_NODE_ICONS[index % PATH_NODE_ICONS.length] as IconName;
}

/** 68×68 node with ledge; `current` adds the soft ring. */
export function PathNode({
  state,
  icon,
  pressed = false,
  testID,
}: {
  state: PathNodeState;
  icon: IconName;
  pressed?: boolean;
  testID?: string;
}) {
  const s = NODE_STYLES[state];
  return (
    <View style={styles.nodeBox} testID={testID}>
      {state === 'current' ? <View style={styles.ring} /> : null}
      <View style={[styles.nodeLedge, { backgroundColor: s.ledge.color, top: s.ledge.offsetY }]} />
      <View
        style={[
          styles.nodeFace,
          { backgroundColor: s.bg },
          pressed ? { transform: [{ translateY: 3 }] } : null,
        ]}
      >
        <Icon name={icon} size={27} color={s.ink} />
      </View>
    </View>
  );
}

function statusLabel(
  t: ReturnType<typeof useI18n>['t'],
  chapter: ChapterNode,
  state: PathNodeState,
): string {
  if (state === 'complete') return t('done');
  if (state === 'current') return chapter.status === 'not_started' ? t('read') : t('continue');
  return chapter.status === 'not_started' ? t('toStart') : t('learning');
}

interface Row {
  y: number;
  height: number;
}

/** Cubic path through node centres with vertical tangents, as in the prototype. */
export function trailPath(points: readonly { x: number; y: number }[]): string {
  const [first, ...rest] = points;
  if (!first) return '';
  let d = `M${first.x} ${first.y}`;
  let prev = first;
  rest.forEach((p, i) => {
    const half = (p.y - prev.y) / 2;
    d +=
      i === 0
        ? ` C${prev.x} ${prev.y + half} ${p.x} ${p.y - half} ${p.x} ${p.y}`
        : ` S${p.x} ${p.y - half} ${p.x} ${p.y}`;
    prev = p;
  });
  return d;
}

export interface LearningPathProps {
  chapters: readonly ChapterNode[];
  currentChapterId: string | null;
  onOpen: (chapter: ChapterNode) => void;
}

/** The winding chapter map: trail, alternating nodes, labels, leaf decorations. */
export function LearningPath({ chapters, currentChapterId, onOpen }: LearningPathProps) {
  const { t } = useI18n();
  const [width, setWidth] = useState(0);
  const [rows, setRows] = useState<Record<number, Row>>({});

  const onRowLayout = useCallback((index: number, e: LayoutChangeEvent) => {
    const { y, height } = e.nativeEvent.layout;
    setRows((prev) =>
      prev[index]?.y === y && prev[index]?.height === height ? prev : { ...prev, [index]: { y, height } },
    );
  }, []);

  const measured = chapters.every((_, i) => rows[i]);
  const points = measured
    ? chapters.map((_, i) => {
        const row = rows[i]!;
        // Node block = 68 face + 5 ledge, vertically centred in the row.
        return { x: PAD_X + (i % 2 ? INDENT : 0) + NODE / 2, y: row.y + row.height / 2 - 2.5 };
      })
    : [];
  const d = trailPath(points);

  return (
    <View
      style={styles.map}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessibilityRole="list"
    >
      {d && width > 0 ? (
        <Svg
          style={StyleSheet.absoluteFill}
          width={width}
          height="100%"
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Path d={d} fill="none" stroke={palette.trail} strokeWidth={16} strokeLinecap="round" />
          <Path
            d={d}
            fill="none"
            stroke={palette.bg}
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray="1 12"
          />
        </Svg>
      ) : null}
      <View style={[styles.leaf, styles.leafOne]} pointerEvents="none">
        <Icon name="Leaf" size={26} color={palette.decoration} />
      </View>
      {chapters.length >= 3 ? (
        <View style={[styles.leaf, styles.leafTwo]} pointerEvents="none">
          <Icon name="Leaf" size={26} color={palette.decoration} />
        </View>
      ) : null}
      {chapters.map((chapter, i) => {
        const state = nodeState(chapter, currentChapterId);
        const status = statusLabel(t, chapter, state);
        const number = String(chapter.number).padStart(2, '0');
        return (
          <Pressable
            key={chapter.id}
            testID={`path-stop-${chapter.number}`}
            onLayout={(e) => onRowLayout(i, e)}
            onPress={() => onOpen(chapter)}
            accessibilityRole="button"
            accessibilityLabel={t('m.learn.chapterA11y', {
              number: chapter.number,
              title: chapter.title,
              status,
            })}
            accessibilityState={{ selected: state === 'current' }}
            style={[styles.stop, i % 2 ? styles.stopIndented : null, i > 0 ? styles.stopGap : null]}
          >
            {({ pressed }) => (
              <>
                <PathNode
                  state={state}
                  icon={nodeIcon(i, state)}
                  pressed={pressed}
                  testID={`path-node-${chapter.number}-${state}`}
                />
                <View style={styles.label}>
                  <AppText
                    size={10}
                    lineHeight={14}
                    weight="700"
                    color={palette.label}
                    style={styles.eyebrow}
                  >
                    {`${t('chapter')} ${number}`.toUpperCase()}
                  </AppText>
                  <AppText
                    academic
                    variant="label"
                    color={state === 'current' ? palette.ink : palette.nodeLabel}
                    style={styles.title}
                  >
                    {chapter.title}
                  </AppText>
                  <AppText
                    variant="caption"
                    weight={state === 'current' ? '700' : '400'}
                    color={state === 'current' ? palette.greenDark : palette.muted}
                  >
                    {state === 'current' ? `${status} →` : status}
                  </AppText>
                </View>
              </>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const PAD_X = 13;

const styles = StyleSheet.create({
  map: { paddingTop: 22, paddingBottom: ROW_GAP, paddingHorizontal: PAD_X, marginHorizontal: -3 },
  stop: { flexDirection: 'row', alignItems: 'center', gap: 17, minHeight: ROW_MIN, paddingRight: 30 },
  stopIndented: { marginLeft: INDENT },
  stopGap: { marginTop: ROW_GAP },
  label: { flex: 1, maxWidth: 220 },
  eyebrow: { letterSpacing: 0.7 },
  title: { marginVertical: 3 },
  nodeBox: { width: NODE, height: NODE + ledge.nodeIdle.offsetY },
  ring: {
    position: 'absolute',
    top: -4,
    left: -4,
    width: NODE + 8,
    height: NODE + 8,
    borderRadius: radius.node + 4,
    backgroundColor: palette.nodeCurrentRing,
  },
  nodeLedge: {
    position: 'absolute',
    left: 0,
    width: NODE,
    height: NODE,
    borderRadius: radius.node,
  },
  nodeFace: {
    width: NODE,
    height: NODE,
    borderRadius: radius.node,
    borderWidth: 4,
    borderColor: palette.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaf: { position: 'absolute' },
  leafOne: { right: 6, top: 83, transform: [{ rotate: '16deg' }] },
  leafTwo: { right: 15, top: 292, transform: [{ rotate: '-12deg' }] },
});


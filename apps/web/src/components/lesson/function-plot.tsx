import type { FunctionPlotData } from '@matriq/validation';

const VIEW = { width: 280, height: 190 };
const AXIS = { left: 36, bottom: 172, right: 266, top: 6 };
const PLOT = { x0: 36, x1: 236, y0: 150, y1: 30 };

function scale(value: number, min: number, max: number, from: number, to: number) {
  if (max === min) return (from + to) / 2;
  return from + ((value - min) / (max - min)) * (to - from);
}

/** Pixel positions for each point inside the 280×190 figure. */
export function plotPoints(points: FunctionPlotData['points']) {
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  return points.map(([x, y]) => ({
    x,
    y,
    px: Math.round(scale(x, xMin, xMax, PLOT.x0, PLOT.x1) * 10) / 10,
    py: Math.round(scale(y, yMin, yMax, PLOT.y0, PLOT.y1) * 10) / 10,
  }));
}

/**
 * A function rule drawn as a line graph with its value table (prototype
 * `functionDiagram()`), generated from `data.type === 'function_plot'`.
 */
export function FunctionPlot({
  data,
  heading,
  labels,
}: {
  data: FunctionPlotData;
  heading: string | null;
  labels: { input: string; output: string };
}) {
  const pts = plotPoints(data.points);
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.px} ${p.py}`).join(' ');
  const gridX = pts.map((p) => `M${p.px} 12V${AXIS.bottom}`).join('');
  const gridY = pts.map((p) => `M${AXIS.left} ${p.py}H263`).join('');

  return (
    <figure lang="en" className="my-[23px] rounded-lg border border-line bg-paper px-3 py-[17px] text-small">
      <strong className="mb-3 block px-[7px] text-small font-bold text-ink">{heading ?? data.rule}</strong>
      <div className="grid gap-[15px] sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] sm:items-center">
        <svg
          viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
          role="img"
          aria-label={`Line graph of ${data.rule}`}
          className="max-h-[190px] w-full"
        >
          <g className="stroke-line" strokeWidth={1} fill="none">
            <path d={gridX + gridY} />
          </g>
          <path
            d={`M${AXIS.left} ${AXIS.top}V${AXIS.bottom}H${AXIS.right}`}
            fill="none"
            className="stroke-decoration"
            strokeWidth={2}
          />
          <path d={line} fill="none" className="stroke-progress-fill" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
          <g className="fill-paper stroke-green" strokeWidth={3}>
            {pts.map((p, i) => (
              <circle key={i} cx={p.px} cy={p.py} r={5} />
            ))}
          </g>
          <g className="fill-muted" fontSize={11} fontFamily="inherit">
            {pts.map((p, i) => (
              <text key={`x${i}`} x={p.px} y={185} textAnchor="middle">
                {p.x}
              </text>
            ))}
            {pts.map((p, i) => (
              <text key={`y${i}`} x={22} y={p.py + 4} textAnchor="middle">
                {p.y}
              </text>
            ))}
            <text x={266} y={185}>
              x
            </text>
            <text x={22} y={12}>
              y
            </text>
          </g>
        </svg>
        <table className="w-full border-collapse text-center text-xs">
          <thead>
            <tr>
              <th scope="col" className="border-b border-line p-1.5 font-bold">
                {labels.input}
              </th>
              <th scope="col" className="border-b border-line p-1.5 font-bold">
                {labels.output}
              </th>
            </tr>
          </thead>
          <tbody>
            {data.points.map(([x, y], i) => (
              <tr key={i}>
                <td className="border-b border-line p-1.5">{x}</td>
                <td className="border-b border-line p-1.5">{y}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.caption ? (
        <figcaption className="mt-3 text-center text-caption font-normal text-muted">{data.caption}</figcaption>
      ) : null}
    </figure>
  );
}

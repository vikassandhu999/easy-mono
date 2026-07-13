import type {WeightEntry} from '@/api/generated';

const W = 560;
const H = 220;
const PAD_X = 44;
const PAD_Y = 22;
const LABEL_Y = 206;

export type WeightChartPoint = Pick<WeightEntry, 'id' | 'unit' | 'value'> & {
  label: string;
};

function formatTick(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export default function WeightChart({points}: {points: WeightChartPoint[]}) {
  if (points.length < 2) {
    return null;
  }

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const lo = min - (span * 0.18 || 1);
  const hi = max + (span * 0.18 || 1);
  const tickCount: number = 4;

  const x = (i: number) => PAD_X + (i / (points.length - 1)) * (W - 2 * PAD_X);
  const y = (v: number) => PAD_Y + (1 - (v - lo) / (hi - lo)) * (H - 58 - PAD_Y);

  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const area = `${line} L${x(points.length - 1).toFixed(1)},${H - 58} L${x(0).toFixed(1)},${H - 58} Z`;
  const ticks = Array.from({length: tickCount}, (_, index) => {
    const ratio = tickCount === 1 ? 0 : index / (tickCount - 1);
    return hi - ratio * (hi - lo);
  });

  return (
    <svg
      aria-label="Weight reduction"
      className="h-56 w-full overflow-visible"
      preserveAspectRatio="none"
      role="img"
      viewBox={`0 0 ${W} ${H}`}
    >
      {ticks.map((tick) => {
        const yy = y(tick);
        return (
          <g key={formatTick(tick)}>
            <text
              className="fill-muted text-[10px] font-semibold"
              textAnchor="end"
              x={PAD_X - 10}
              y={yy + 3}
            >
              {formatTick(tick)}
            </text>
            <line
              className="stroke-border/70"
              strokeWidth="1"
              x1={PAD_X}
              x2={W - 8}
              y1={yy}
              y2={yy}
            />
          </g>
        );
      })}
      <path
        className="fill-accent/10"
        d={area}
      />
      <path
        className="fill-none stroke-accent"
        d={line}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.5"
        vectorEffect="non-scaling-stroke"
      />
      {points.map((point, index) => (
        <g key={point.id}>
          <circle
            className="fill-surface stroke-accent"
            cx={x(index)}
            cy={y(point.value)}
            r="4"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
          <text
            className="fill-foreground font-grotesk text-[11px] font-bold"
            textAnchor="middle"
            x={x(index)}
            y={y(point.value) - 12}
          >
            {formatTick(point.value)}
          </text>
          <text
            className="fill-muted text-[11px] font-semibold"
            textAnchor="middle"
            x={x(index)}
            y={LABEL_Y}
          >
            {point.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

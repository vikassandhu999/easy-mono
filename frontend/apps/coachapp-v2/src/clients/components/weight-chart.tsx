import type {WeightEntry} from '@/api/generated';

const W = 520;
const H = 160;
const PAD_LEFT = 12;
const PAD_RIGHT = 12;
const PAD_TOP = 22;
const PAD_BOTTOM = 14;

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
  const lo = Math.min(...values) - 1;
  const hi = Math.max(...values) + 1;
  const tickCount: number = 4;

  const x = (index: number) => PAD_LEFT + ((W - PAD_LEFT - PAD_RIGHT) * index) / (points.length - 1);
  const y = (value: number) => PAD_TOP + (H - PAD_TOP - PAD_BOTTOM) * (1 - (value - lo) / (hi - lo));

  const line = points.map((point, index) => `${x(index).toFixed(1)},${y(point.value).toFixed(1)}`).join(' ');
  const area = `M${x(0).toFixed(1)},${(H - PAD_BOTTOM).toFixed(1)} L${points
    .map((point, index) => `${x(index).toFixed(1)},${y(point.value).toFixed(1)}`)
    .join(' L')} L${x(points.length - 1).toFixed(1)},${(H - PAD_BOTTOM).toFixed(1)} Z`;
  const ticks = Array.from({length: tickCount}, (_, index) => {
    const value = hi - ((hi - lo) * index) / (tickCount - 1);
    return {top: `${(y(value) / H) * 100}%`, value};
  });
  const positionedPoints = points.map((point, index) => ({
    ...point,
    left: `${(x(index) / W) * 100}%`,
    top: `${(y(point.value) / H) * 100}%`,
  }));

  return (
    <div
      aria-label="Weight reduction"
      className="relative h-[180px] w-full lg:h-[200px]"
      role="img"
    >
      <div className="absolute top-0 right-[6px] bottom-[22px] left-[34px] lg:right-2 lg:left-[37px]">
        {ticks.map((tick) => (
          <div
            aria-hidden
            className="absolute right-0 left-0 flex -translate-y-1/2 items-center"
            key={formatTick(tick.value)}
            style={{top: tick.top}}
          >
            <span className="absolute -left-8 w-7 text-right text-[9px] font-semibold text-muted lg:-left-[34px] lg:w-[30px] lg:text-[9.5px]">
              {formatTick(tick.value)}
            </span>
            <span className="h-px w-full bg-surface-secondary" />
          </div>
        ))}

        <svg
          aria-hidden
          className="block size-full"
          preserveAspectRatio="none"
          viewBox={`0 0 ${W} ${H}`}
        >
          <path
            className="fill-accent/10"
            d={area}
          />
          <polyline
            className="fill-none stroke-accent"
            points={line}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {positionedPoints.map((point) => (
          <div
            aria-hidden
            className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent bg-surface lg:size-[9px]"
            key={`${point.id}-dot`}
            style={{left: point.left, top: point.top}}
          />
        ))}
        {positionedPoints.map((point) => (
          <div
            aria-hidden
            className="absolute -translate-x-1/2 -translate-y-[165%] text-[9.5px] font-bold whitespace-nowrap text-foreground lg:text-[10.5px]"
            key={`${point.id}-value`}
            style={{left: point.left, top: point.top}}
          >
            {formatTick(point.value)}
          </div>
        ))}
        {positionedPoints.map((point) => (
          <div
            aria-hidden
            className="absolute top-full -translate-x-1/2 translate-y-[6px] text-[9.5px] font-semibold whitespace-nowrap text-muted lg:text-[10.5px]"
            key={`${point.id}-label`}
            style={{left: point.left}}
          >
            {point.label}
          </div>
        ))}
      </div>
    </div>
  );
}

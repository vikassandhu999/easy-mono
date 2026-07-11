export type RatingTrendPoint = {
  date: string;
  id: string;
  value: number;
};

const WIDTH = 240;
const HEIGHT = 64;
const PAD_X = 8;
const PAD_Y = 8;

export default function RatingSparkline({label, points}: {label: string; points: RatingTrendPoint[]}) {
  if (points.length === 0) {
    return null;
  }

  const x = (index: number) =>
    points.length === 1 ? WIDTH / 2 : PAD_X + (index / (points.length - 1)) * (WIDTH - PAD_X * 2);
  const y = (value: number) => PAD_Y + ((5 - value) / 4) * (HEIGHT - PAD_Y * 2);
  const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${x(index)},${y(point.value)}`).join(' ');
  const latest = points[points.length - 1]!;

  return (
    <div className="rounded-2xl border border-border bg-surface-secondary p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 text-sm font-semibold">{label}</div>
        <div className="shrink-0 font-grotesk text-lg font-bold">{latest.value}/5</div>
      </div>
      {points.length > 1 ? (
        <svg
          aria-label={`${label} rating trend from ${points[0]?.value} to ${latest.value} out of 5`}
          className="mt-2 h-16 w-full"
          preserveAspectRatio="none"
          role="img"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        >
          {[1, 3, 5].map((value) => (
            <line
              className="stroke-border"
              key={value}
              strokeDasharray="3 4"
              x1={PAD_X}
              x2={WIDTH - PAD_X}
              y1={y(value)}
              y2={y(value)}
            />
          ))}
          <path
            className="fill-none stroke-accent"
            d={line}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
            vectorEffect="non-scaling-stroke"
          />
          {points.map((point, index) => (
            <circle
              className="fill-surface stroke-accent"
              cx={x(index)}
              cy={y(point.value)}
              key={point.id}
              r="3.5"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
      ) : (
        <p className="mt-2 text-xs text-muted">One response so far</p>
      )}
    </div>
  );
}

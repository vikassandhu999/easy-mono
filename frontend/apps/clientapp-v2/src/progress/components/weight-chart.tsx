/**
 * Weight trend — a small native SVG line chart (no chart lib). Plots entries over
 * time with an accent line + area fill and an optional dashed goal line. Dark + periwinkle.
 */
import type {WeightEntry} from '@/api/progress';

const W = 320;
const H = 130;
const PAD = 10;

export default function WeightChart({entries, goal}: {entries: WeightEntry[]; goal: null | number}) {
  const pts = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  if (pts.length < 2) {
    return null;
  }

  const values = pts.map((p) => p.value);
  const min = Math.min(...values, ...(goal != null ? [goal] : []));
  const max = Math.max(...values, ...(goal != null ? [goal] : []));
  const span = max - min;
  const lo = min - (span * 0.18 || 1);
  const hi = max + (span * 0.18 || 1);

  const x = (i: number) => PAD + (i / (pts.length - 1)) * (W - 2 * PAD);
  const y = (v: number) => PAD + (1 - (v - lo) / (hi - lo)) * (H - 2 * PAD);

  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const area = `${line} L${x(pts.length - 1).toFixed(1)},${H - PAD} L${x(0).toFixed(1)},${H - PAD} Z`;

  return (
    <svg
      aria-label="Weight trend"
      className="w-full"
      preserveAspectRatio="none"
      role="img"
      viewBox={`0 0 ${W} ${H}`}
    >
      <defs>
        <linearGradient
          id="wfill"
          x1="0"
          x2="0"
          y1="0"
          y2="1"
        >
          <stop
            offset="0%"
            stopColor="#0485f7"
            stopOpacity="0.25"
          />
          <stop
            offset="100%"
            stopColor="#0485f7"
            stopOpacity="0"
          />
        </linearGradient>
      </defs>
      {goal != null ? (
        <line
          stroke="#17a768"
          strokeDasharray="4 4"
          strokeWidth="1"
          x1={PAD}
          x2={W - PAD}
          y1={y(goal)}
          y2={y(goal)}
        />
      ) : null}
      <path
        d={area}
        fill="url(#wfill)"
      />
      <path
        d={line}
        fill="none"
        stroke="#0485f7"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      {pts.map((p, i) => (
        <circle
          cx={x(i)}
          cy={y(p.value)}
          fill={i === pts.length - 1 ? '#0485f7' : '#fff'}
          key={p.id}
          r={i === pts.length - 1 ? 3.5 : 2.5}
          stroke="#0485f7"
          strokeWidth="1.5"
        />
      ))}
    </svg>
  );
}

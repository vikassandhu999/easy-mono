/**
 * Weight trend — a small native SVG line chart (no chart lib), in the coachapp light
 * theme via accent/success tokens. Plots entries over time with an area fill and an
 * optional dashed goal line.
 */
import type {WeightEntry} from '@/api/generated';

const W = 320;
const H = 110;
const PAD = 8;

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
      {goal != null ? (
        <line
          className="stroke-success"
          strokeDasharray="4 4"
          strokeWidth="1"
          x1={PAD}
          x2={W - PAD}
          y1={y(goal)}
          y2={y(goal)}
        />
      ) : null}
      <path
        className="fill-accent/10"
        d={area}
      />
      <path
        className="fill-none stroke-accent"
        d={line}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      {pts.map((p, i) => (
        <circle
          className={i === pts.length - 1 ? 'fill-accent stroke-accent' : 'fill-surface stroke-accent'}
          cx={x(i)}
          cy={y(p.value)}
          key={p.id}
          r={i === pts.length - 1 ? 3.5 : 2.5}
          strokeWidth="1.5"
        />
      ))}
    </svg>
  );
}

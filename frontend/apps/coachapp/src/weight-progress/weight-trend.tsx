import {formatDateLong} from '@easy/utils';
import type {WeightProgress} from '../api/weight-progress';
import {Surface} from '../ui/page';

export function WeightTrend({progress}: {progress: WeightProgress}) {
  const {summary, goal, chart, unit} = progress;
  const first = summary.first_entry;
  const latest = summary.latest_entry;
  const from = Date.parse(progress.from);
  const to = Date.parse(progress.to);
  const minimum = chart.min;
  const maximum = chart.max;
  return (
    <Surface className="space-y-6">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4">
        <div>
          <dt className="text-xs text-muted-foreground">Latest in range</dt>
          <dd className="mt-1 text-xl font-semibold">{latest ? `${latest.value} ${latest.unit}` : 'No readings'}</dd>
          {latest && <dd className="mt-1 text-xs text-muted-foreground">{formatDateLong(latest.date)}</dd>}
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Change in range</dt>
          <dd className="mt-1 text-xl font-semibold">
            {progress.count > 1 && summary.total_change !== null
              ? `${summary.total_change > 0 ? '+' : ''}${summary.total_change} ${summary.change_unit}`
              : '—'}
          </dd>
          {progress.count === 1 && <dd className="mt-1 text-xs text-muted-foreground">One reading recorded</dd>}
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">First in range</dt>
          <dd className="mt-1 font-semibold">{first ? `${first.value} ${first.unit}` : '—'}</dd>
          {first && <dd className="mt-1 text-xs text-muted-foreground">{formatDateLong(first.date)}</dd>}
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Goal weight</dt>
          <dd className="mt-1 font-semibold">{goal ? `${goal.value} ${goal.unit}` : 'Not set'}</dd>
        </div>
      </dl>
      {minimum !== null && maximum !== null && maximum > minimum && chart.points.length > 0 ? (
        <figure
          aria-label={`Weight trend in ${unit}`}
          className="space-y-3"
        >
          <div className="grid grid-cols-[4rem_minmax(0,1fr)] gap-3">
            <div className="flex h-52 flex-col justify-between text-xs text-muted-foreground">
              <span>
                {maximum} {unit}
              </span>
              <span>
                {minimum} {unit}
              </span>
            </div>
            <div className="relative h-52">
              <svg
                aria-hidden="true"
                viewBox="0 0 1000 200"
                preserveAspectRatio="none"
                className="h-full w-full overflow-visible"
              >
                <path
                  d="M0 0 H1000 M0 200 H1000"
                  className="stroke-border"
                  fill="none"
                  vectorEffect="non-scaling-stroke"
                />
                <polyline
                  points={chart.points
                    .map((point) => {
                      const x = to === from ? 500 : ((Date.parse(point.date) - from) / (to - from)) * 1000;
                      const y = ((maximum - point.value) / (maximum - minimum)) * 200;
                      return `${x},${y}`;
                    })
                    .join(' ')}
                  className="stroke-foreground"
                  fill="none"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              {chart.points.map((point) => (
                <span
                  key={point.id}
                  aria-hidden="true"
                  className="absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground"
                  style={{
                    left: `${to === from ? 50 : ((Date.parse(point.date) - from) / (to - from)) * 100}%`,
                    top: `${((maximum - point.value) / (maximum - minimum)) * 100}%`,
                  }}
                />
              ))}
            </div>
          </div>
          <div className="ml-19 flex justify-between gap-4 text-xs text-muted-foreground">
            <time dateTime={progress.from}>{formatDateLong(progress.from)}</time>
            <time dateTime={progress.to}>{formatDateLong(progress.to)}</time>
          </div>
          <figcaption className="text-xs text-muted-foreground">
            Latest measurement on each recorded date, shown in {unit}. Every reading is available in the history below.
          </figcaption>
        </figure>
      ) : (
        <p className="text-sm text-muted-foreground">
          The trend will appear when measurements are recorded in this date range.
        </p>
      )}
    </Surface>
  );
}

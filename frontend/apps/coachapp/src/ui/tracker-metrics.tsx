import {useState} from 'react';
import {useAttachmentDownloads} from '../api/attachments';
import type {TrackerEntry, TrackerMetrics} from '../api/trackers';
import {Button} from './button';
import {FormError} from './form-error';
import {Surface} from './page';
import {SelectItem} from './select';
import {SelectField} from './select-field';
import {trackerDisplayValue} from './tracker-values';
export function TrackerMetricsDisplay({value, unit}: {value: TrackerMetrics; unit: string}) {
  const [comparison, setComparison] = useState<'previous' | 'first'>('previous');
  const numeric = value.tracker.kind === 'number' || value.tracker.kind === 'rating';
  const show = (number: number | null) => trackerDisplayValue(number, value.tracker, unit);
  return (
    <Surface className="space-y-5">
      <p className="font-medium">
        {value.tracker.name}: {value.count} entries
      </p>
      {value.count === 0 && <p>Not recorded. No entries exist in this range.</p>}
      {numeric && (
        <>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              ['Average', value.average],
              ['Minimum', value.min],
              ['Maximum', value.max],
              ['Change from previous range', value.change],
            ].map(([label, number]) => (
              <div key={String(label)}>
                <dt className="text-sm text-muted-foreground">{label}</dt>
                <dd className="text-lg font-semibold">
                  {show(typeof number === 'number' ? number : null)}
                  {number !== null ? ` ${unit}` : ''}
                </dd>
              </div>
            ))}
          </dl>
          <Trend
            value={value}
            unit={unit}
          />
        </>
      )}
      <div className="space-y-2 text-sm">
        {value.workout_coverage.total > 0 && (
          <p>
            {value.tracker.name} after {value.workout_coverage.recorded} of {value.workout_coverage.total} workouts
          </p>
        )}
        {value.meal_coverage.total > 0 && (
          <p>
            {value.tracker.name} after {value.meal_coverage.recorded} of {value.meal_coverage.total} meals
          </p>
        )}
      </div>
      {value.tracker.kind === 'photo' && value.latest && (
        <section className="space-y-4">
          <h3 className="editor-item-title">Photo comparison</h3>
          <SelectField
            aria-label="Compare latest photo with"
            value={comparison}
            onChange={(selected) => setComparison(selected === 'first' ? 'first' : 'previous')}
          >
            <SelectItem id="previous">Previous photo</SelectItem>
            <SelectItem id="first">First photo</SelectItem>
          </SelectField>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h4 className="font-medium">Latest · {value.latest.local_date}</h4>
              <TrackerEntryFiles entry={value.latest} />
            </div>
            {value[comparison] ? (
              <div>
                <h4 className="font-medium">
                  {comparison === 'first' ? 'First' : 'Previous'} · {value[comparison].local_date}
                </h4>
                <TrackerEntryFiles entry={value[comparison]} />
              </div>
            ) : (
              <p>No {comparison} photo exists.</p>
            )}
          </div>
        </section>
      )}
    </Surface>
  );
}

function Trend({value, unit}: {value: TrackerMetrics; unit: string}) {
  if (value.series.length === 0 || value.min === null || value.max === null) {
    return null;
  }
  const minimum = value.min;
  const spread = value.max - minimum || 1;
  const equal = value.min === value.max;
  const ticks = equal
    ? [{number: minimum, y: 90}]
    : [
        {number: value.max, y: 10},
        {number: (value.min + value.max) / 2, y: 90},
        {number: value.min, y: 170},
      ];
  const points = value.series.map((point, index) => ({
    ...point,
    x: value.series.length === 1 ? 300 : 10 + (index * 580) / (value.series.length - 1),
    y: equal ? 90 : 170 - ((point.value - minimum) / spread) * 160,
  }));
  return (
    <figure className="space-y-2">
      <figcaption className="text-sm font-medium">
        {value.tracker.name} trend ({unit || 'rating'})
      </figcaption>
      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2">
        <div
          aria-hidden="true"
          className="relative h-48 min-w-16 text-xs text-muted-foreground"
        >
          {ticks.map((tick) => (
            <span
              key={tick.y}
              className="absolute right-0 -translate-y-1/2 whitespace-nowrap"
              style={{top: `${(tick.y / 180) * 100}%`}}
            >
              {trackerDisplayValue(tick.number, value.tracker, unit)} {unit}
            </span>
          ))}
        </div>
        <svg
          role="img"
          aria-label={`${value.tracker.name} trend chart`}
          viewBox="0 0 600 180"
          preserveAspectRatio="none"
          className="h-48 w-full text-primary"
        >
          <title>{value.tracker.name} trend</title>
          {ticks.map((tick) => (
            <path
              key={tick.y}
              d={`M0 ${tick.y} H600`}
              fill="none"
              stroke="currentColor"
              opacity="0.15"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <path
            d="M0 0 V180"
            fill="none"
            stroke="currentColor"
            opacity="0.3"
          />
          <polyline
            points={points.map((point) => `${point.x},${point.y}`).join(' ')}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            vectorEffect="non-scaling-stroke"
          />
          {points.map((point) => (
            <circle
              key={point.entry_id}
              cx={point.x}
              cy={point.y}
              r="4"
              fill="currentColor"
            >
              <title>
                {point.date}: {trackerDisplayValue(point.value, value.tracker, unit)} {unit}
              </title>
            </circle>
          ))}
        </svg>
        <div className="col-start-2 flex justify-between gap-3 text-xs text-muted-foreground">
          <span>{value.series[0]?.date}</span>
          {value.series.length > 1 && <span>{value.series.at(-1)?.date}</span>}
        </div>
      </div>
    </figure>
  );
}

export function TrackerEntryFiles({entry}: {entry: TrackerEntry}) {
  const ids = entry.attachments.map((attachment) => attachment.id);
  const query = useAttachmentDownloads(ids, true);
  return (
    <div className="space-y-3">
      {query.isPending && <p role="status">Loading files…</p>}
      {query.isError && (
        <>
          <FormError message="Could not load private files." />
          <Button
            variant="outline"
            onPress={() => {
              query.refetch();
            }}
          >
            Retry files
          </Button>
        </>
      )}
      <ol className="space-y-4">
        {entry.attachments.map((attachment, index) => {
          const download = query.data?.data.find((value) => value.id === attachment.id);
          return (
            <li
              key={attachment.id}
              className="space-y-2"
            >
              <p className="text-sm">
                File {index + 1}
                {attachment.captured_on ? ` · Captured ${attachment.captured_on}` : ''}
              </p>
              {download && (
                <>
                  {attachment.content_type.startsWith('image/') && (
                    <img
                      src={download.download_url}
                      alt={`${entry.tracker.name}, ${entry.local_date}, file ${index + 1}`}
                      loading="lazy"
                      className="max-h-96 w-full rounded-xl object-contain"
                    />
                  )}
                  <div className="flex flex-wrap gap-4">
                    <a
                      className="text-link"
                      href={download.download_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View file {index + 1}
                    </a>
                    <a
                      className="text-link"
                      href={download.download_url}
                      download
                    >
                      Download file {index + 1}
                    </a>
                  </div>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

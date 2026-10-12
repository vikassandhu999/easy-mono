import {useState} from 'react';
import {TextField} from 'react-aria-components';
import {generatePath, Link, useParams, useSearchParams} from 'react-router-dom';
import {useAttachmentUrls} from '../api/attachments';
import {useProfile} from '../api/auth';
import {errorMessage} from '../api/client';
import {
  type Tracker,
  type TrackerEntry,
  type TrackerMetrics,
  useRemoveTrackerEntry,
  useTracker,
  useTrackerEntries,
  useTrackerMetrics,
  useTrackers,
  useTrackerToday,
} from '../api/trackers';
import {routes} from '../routes';
import {Button} from '../ui/button';
import {CachedRead} from '../ui/cached-read';
import {useCoaching} from '../ui/coaching';
import {Confirm} from '../ui/confirm';
import {FormError} from '../ui/form-error';
import {Input} from '../ui/input';
import {Label} from '../ui/label';
import {Page} from '../ui/page';
import {ReadState} from '../ui/read-state';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';
import {defaultTrackerUnit} from '../ui/tracker-draft';
import {TrackerRecording} from '../ui/tracker-recording';

export function TodayTrackers() {
  const query = useTrackerToday();
  const {canWrite} = useCoaching();
  return (
    <section className="mb-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Trackers</h2>
        <Link
          className="text-primary underline"
          to={routes.trackers}
        >
          History
        </Link>
      </div>
      {canWrite &&
        (query.data ? (
          <>
            <CachedRead
              updatedAt={query.dataUpdatedAt}
              failed={query.isError}
              refreshing={query.isFetching}
              refresh={() => query.refetch()}
            />
            <h3 className="font-semibold">To record</h3>
            {query.data.data.due.length ? (
              query.data.data.due.map((item) => (
                <PromptLink
                  key={item.id}
                  tracker={item.tracker}
                />
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Nothing to record today.</p>
            )}
            {query.data.data.requests.length > 0 && (
              <>
                <h3 className="font-semibold">Your coach asked for</h3>
                {query.data.data.requests.map((item) => (
                  <div key={item.id}>
                    <PromptLink tracker={item.tracker} />
                    <p className="mt-1 text-xs text-muted-foreground">Requested {item.requested_at.slice(0, 10)}</p>
                  </div>
                ))}
              </>
            )}
          </>
        ) : (
          <ReadState
            label="your Trackers"
            failed={query.isError}
            retry={() => {
              query.refetch();
            }}
          />
        ))}
      {canWrite && (
        <Link
          className="inline-flex rounded-2xl border px-4 py-3 font-semibold"
          to={routes.trackers}
        >
          Add something else
        </Link>
      )}
    </section>
  );
}
function PromptLink({tracker}: {tracker: Tracker}) {
  return (
    <Link
      className="block rounded-2xl bg-surface p-4 font-semibold"
      to={`${generatePath(routes.tracker, {id: tracker.id})}?record=1`}
    >
      Record {tracker.name}
    </Link>
  );
}
export function Trackers() {
  const [search, setSearch] = useState('');
  const [archived, setArchived] = useState(false);
  const query = useTrackers(search, archived);
  const {canWrite} = useCoaching();
  return (
    <Page
      title="Trackers"
      description={canWrite ? 'Record something or read your history.' : 'Read your recorded entries and trends.'}
      back={routes.home}
    >
      <TextField
        value={search}
        onChange={setSearch}
      >
        <Label>Search Trackers</Label>
        <Input type="search" />
      </TextField>
      <Button
        className="mt-3"
        variant="outline"
        onPress={() => setArchived(!archived)}
      >
        {archived ? 'Show active Trackers' : 'Show archived history'}
      </Button>
      <div className="mt-5 space-y-3">
        {query.data ? (
          <>
            <CachedRead
              updatedAt={query.dataUpdatedAt}
              failed={query.isError}
              refreshing={query.isFetching}
              refresh={() => query.refetch()}
            />
            {query.data.pages
              .flatMap((page) => page.data)
              .map((item) => (
                <Link
                  key={item.id}
                  className="block rounded-2xl bg-surface p-4"
                  to={generatePath(routes.tracker, {id: item.id})}
                >
                  <span className="font-semibold">{item.name}</span>
                  <span className="block text-sm text-muted-foreground">{item.kind.replace('_', '/')}</span>
                </Link>
              ))}
            {query.data.pages[0]?.data.length === 0 && <p>No Trackers found.</p>}
            {query.hasNextPage && (
              <Button
                variant="outline"
                isDisabled={query.isFetchingNextPage}
                onPress={() => {
                  query.fetchNextPage();
                }}
              >
                Load more Trackers
              </Button>
            )}
          </>
        ) : (
          <ReadState
            label="Trackers"
            failed={query.isError}
            retry={() => {
              query.refetch();
            }}
          />
        )}
      </div>
    </Page>
  );
}
export function TrackerHistory() {
  const {id = ''} = useParams();
  const query = useTracker(id);
  const profile = useProfile().data?.data;
  return (
    <Page
      title={query.data?.data.name ?? 'Tracker'}
      back={routes.trackers}
    >
      {query.data && profile ? (
        <TrackerDetail
          key={id}
          tracker={query.data.data}
          date={profile.local_date}
          system={profile.unit_system}
        />
      ) : (
        <ReadState
          label="this Tracker"
          failed={query.isError}
          retry={() => {
            query.refetch();
          }}
        />
      )}
    </Page>
  );
}
function TrackerDetail({tracker, date, system}: {tracker: Tracker; date: string; system: string}) {
  const [params] = useSearchParams();
  const [record, setRecord] = useState(params.has('record'));
  const [edit, setEdit] = useState<TrackerEntry | null>(null);
  const [to, setTo] = useState(date);
  const [from, setFrom] = useState(() => {
    const day = new Date(`${date}T12:00:00Z`);
    day.setUTCDate(day.getUTCDate() - 29);
    return day.toISOString().slice(0, 10);
  });
  const [unit, setUnit] = useState(defaultTrackerUnit(tracker, system));
  const entries = useTrackerEntries(tracker.id, from, to);
  const metrics = useTrackerMetrics(tracker.id, from, to);
  const {canWrite} = useCoaching();
  const currentEdit = edit
    ? (entries.data?.pages.flatMap((page) => page.data).find((row) => row.id === edit.id) ?? edit)
    : null;
  const factor = tracker.units.find((item) => item.unit === unit)?.to_base_factor ?? 1;
  return (
    <div className="space-y-5">
      {canWrite && !tracker.archived_at && (
        <Button
          onPress={() => {
            setEdit(null);
            setRecord(!record);
          }}
        >
          {record ? 'Close recording' : 'Record entry'}
        </Button>
      )}
      {record && canWrite && (
        <TrackerRecording
          key={edit?.id ?? 'new'}
          tracker={tracker}
          date={date}
          {...(currentEdit ? {entry: currentEdit} : {})}
          onSaved={() => {
            setRecord(false);
            setEdit(null);
          }}
        />
      )}
      <h2 className="text-xl font-semibold">History</h2>
      <div className="grid grid-cols-2 gap-3">
        <TextField
          value={from}
          onChange={setFrom}
        >
          <Label>From</Label>
          <Input type="date" />
        </TextField>
        <TextField
          value={to}
          onChange={setTo}
        >
          <Label>To</Label>
          <Input type="date" />
        </TextField>
      </div>
      {tracker.kind === 'number' && tracker.units.length > 0 && (
        <SelectField
          aria-label="History unit"
          value={unit}
          onChange={setUnit}
        >
          {tracker.units.map((item) => (
            <SelectItem
              key={item.unit}
              id={item.unit}
            >
              {item.unit}
            </SelectItem>
          ))}
        </SelectField>
      )}
      {metrics.data ? (
        <>
          <CachedRead
            updatedAt={metrics.dataUpdatedAt}
            failed={metrics.isError}
            refreshing={metrics.isFetching}
            refresh={() => metrics.refetch()}
          />
          <Metrics
            metrics={metrics.data.data}
            factor={factor}
            unit={unit}
          />
        </>
      ) : (
        <ReadState
          label="Tracker trends"
          failed={metrics.isError}
          retry={() => {
            metrics.refetch();
          }}
        />
      )}
      {entries.data ? (
        <>
          <CachedRead
            updatedAt={entries.dataUpdatedAt}
            failed={entries.isError}
            refreshing={entries.isFetching}
            refresh={() => entries.refetch()}
          />
          {entries.data.pages
            .flatMap((page) => page.data)
            .map((entry) => (
              <Entry
                key={`${entry.id}.${entry.revision}`}
                entry={entry}
                factor={factor}
                unit={unit}
                canWrite={canWrite}
                onEdit={() => {
                  setEdit(entry);
                  setRecord(true);
                }}
              />
            ))}
          {entries.data.pages[0]?.data.length === 0 && <p>No entries recorded.</p>}
          {entries.hasNextPage && (
            <Button
              variant="outline"
              isDisabled={entries.isFetchingNextPage}
              onPress={() => {
                entries.fetchNextPage();
              }}
            >
              Load more entries
            </Button>
          )}
        </>
      ) : (
        <ReadState
          label="Tracker history"
          failed={entries.isError}
          retry={() => {
            entries.refetch();
          }}
        />
      )}
    </div>
  );
}
function valueLabel(value: number | null, factor: number, unit: string) {
  return value === null ? 'Not recorded' : `${Number((value / factor).toFixed(2))} ${unit}`.trim();
}
function Metrics({metrics, factor, unit}: {metrics: TrackerMetrics; factor: number; unit: string}) {
  const [comparison, setComparison] = useState('previous');
  const compared = comparison === 'first' ? metrics.first : (metrics.previous ?? metrics.first);
  const values = metrics.series.map((point) => point.value / factor);
  const min = Math.min(...values);
  const max = Math.max(...values);
  return (
    <section
      className="rounded-3xl bg-surface p-5 space-y-3"
      aria-label="Tracker trends"
    >
      <p className="font-semibold">{metrics.count} entries</p>
      {metrics.average !== null && (
        <dl className="grid grid-cols-2 gap-3 text-sm">
          {[
            ['Average', metrics.average],
            ['Minimum', metrics.min],
            ['Maximum', metrics.max],
            ['Change', metrics.change],
          ].map(([label, value]) => (
            <div key={String(label)}>
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-semibold">{valueLabel(typeof value === 'number' ? value : null, factor, unit)}</dd>
            </div>
          ))}
        </dl>
      )}
      {values.length > 1 && (
        <svg
          viewBox="0 0 300 110"
          role="img"
          aria-label={`${metrics.tracker.name} trend over ${values.length} entries`}
          className="w-full text-primary"
        >
          <title>{metrics.tracker.name} trend</title>
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            points={values
              .map(
                (value, index) =>
                  `${10 + (index / (values.length - 1)) * 280},${100 - ((value - min) / (max - min || 1)) * 90}`,
              )
              .join(' ')}
          />
        </svg>
      )}
      {metrics.workout_coverage.total > 0 && (
        <p className="text-sm">
          {metrics.tracker.name} after {metrics.workout_coverage.recorded} of {metrics.workout_coverage.total} workouts
        </p>
      )}
      {metrics.tracker.kind === 'photo' && metrics.latest && (
        <div>
          <h3 className="font-semibold">Latest photo</h3>
          <Attachments entry={metrics.latest} />
          <SelectField
            aria-label="Compare photo with"
            value={comparison}
            onChange={setComparison}
          >
            <SelectItem id="previous">Previous photo</SelectItem>
            <SelectItem id="first">First photo</SelectItem>
          </SelectField>
          {compared?.id !== metrics.latest.id && compared && (
            <>
              <h3 className="mt-3 font-semibold">
                {comparison === 'first' ? 'First photo' : 'Previous or first photo'}
              </h3>
              <Attachments entry={compared} />
            </>
          )}
        </div>
      )}
    </section>
  );
}
function Entry({
  entry,
  factor,
  unit,
  canWrite,
  onEdit,
}: {
  entry: TrackerEntry;
  factor: number;
  unit: string;
  canWrite: boolean;
  onEdit: () => void;
}) {
  const [remove, setRemove] = useState(false);
  const [error, setError] = useState('');
  const mutation = useRemoveTrackerEntry();
  return (
    <article className="rounded-3xl bg-surface p-5 space-y-3">
      <p className="text-sm text-muted-foreground">
        {entry.local_date}
        {entry.recorded_by_type === 'coach' ? ' · Recorded by coach' : ''}
      </p>
      <p className="whitespace-pre-wrap text-lg font-semibold">
        {entry.number_value !== null
          ? valueLabel(entry.number_value, factor, unit)
          : entry.rating_value !== null
            ? `${entry.rating_value} / ${entry.tracker.scale_max}`
            : entry.yes_no_value !== null
              ? entry.yes_no_value
                ? 'Yes'
                : 'No'
              : entry.text_value}
      </p>
      <Attachments entry={entry} />
      <FormError message={error} />
      {canWrite && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onPress={onEdit}
          >
            Correct entry
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onPress={() => setRemove(true)}
          >
            Remove entry
          </Button>
        </div>
      )}
      {remove && (
        <Confirm
          title="Remove this entry?"
          action="Remove entry"
          pending={mutation.isPending}
          onClose={() => setRemove(false)}
          onConfirm={async () => {
            try {
              await mutation.mutateAsync({id: entry.id, revision: entry.revision});
              setRemove(false);
            } catch (cause) {
              setError(errorMessage(cause, 'The removal could not be confirmed. Try again.'));
              setRemove(false);
            }
          }}
        >
          <p>This removes the entry from your history.</p>
        </Confirm>
      )}
    </article>
  );
}
function Attachments({entry}: {entry: TrackerEntry}) {
  const query = useAttachmentUrls(entry.attachments.map((item) => item.id));
  if (!entry.attachments.length) {
    return null;
  }
  return (
    <ol className="space-y-3">
      {entry.attachments.map((item, index) => {
        const url = query.data?.data.find((row) => row.id === item.id)?.download_url;
        return (
          <li key={item.id}>
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="block text-primary underline"
              >
                {item.content_type.startsWith('image/') && (
                  <img
                    src={url}
                    alt={`${entry.tracker.name}, file ${index + 1}`}
                    className="mb-2 max-h-80 w-full rounded-2xl object-contain"
                  />
                )}
                View {item.content_type === 'application/pdf' ? 'PDF' : 'image'} {index + 1}
              </a>
            ) : (
              <p>Loading file {index + 1}…</p>
            )}
            {url && (
              <a
                href={url}
                download
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-sm text-primary underline"
              >
                Download file {index + 1}
              </a>
            )}
            {item.captured_on && <p className="text-xs text-muted-foreground">Captured {item.captured_on}</p>}
          </li>
        );
      })}
      {query.isError && (
        <li>
          <Button
            variant="outline"
            onPress={() => {
              query.refetch();
            }}
          >
            Retry files
          </Button>
        </li>
      )}
    </ol>
  );
}

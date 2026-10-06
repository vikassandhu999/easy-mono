import {addDays} from '@easy/utils';
import {useState} from 'react';
import {generatePath, Link, useParams, useSearchParams} from 'react-router-dom';
import {useClient} from '../api/clients';
import {type TrackerEntry, useTracker, useTrackerEntries, useTrackerMetrics} from '../api/trackers';
import {routes} from '../routes';
import {Button, buttonVariants} from '../ui/button';
import {FormError} from '../ui/form-error';
import {InfiniteList} from '../ui/infinite-list';
import {Input} from '../ui/input';
import {Page, PageHeader, Surface} from '../ui/page';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';
import {TrackerEntryFiles, TrackerMetricsDisplay} from '../ui/tracker-metrics';
import {TrackerPicker} from '../ui/tracker-picker';
import {defaultTrackerUnit, entryValue} from './entry';

export function TrackerHistory() {
  const {clientId = ''} = useParams();
  const [params, setParams] = useSearchParams();
  const id = params.get('tracker_id') ?? '';
  const person = useClient(clientId);
  const tracker = useTracker(id);
  const [picking, setPicking] = useState(false);
  const [chosenUnit, setChosenUnit] = useState<{id: string; unit: string} | null>(null);
  const today = person.data?.data.local_date ?? '';
  const from = params.get('from') ?? (today ? addDays(today, -29).toString() : '');
  const to = params.get('to') ?? today;
  const filters = {...(from ? {from} : {}), ...(to ? {to} : {})};
  const metrics = useTrackerMetrics(clientId, id, filters);
  const entries = useTrackerEntries(clientId, {...filters, ...(id ? {tracker_id: id} : {})});
  const selected = tracker.data?.data;
  const unit = selected
    ? chosenUnit?.id === id
      ? chosenUnit.unit
      : defaultTrackerUnit(selected, person.data?.data.unit_system ?? 'metric')
    : '';
  function setFilter(name: string, value: string) {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      if (value) {
        next.set(name, value);
      } else {
        next.delete(name);
      }
      return next;
    });
  }
  return (
    <Page className="client-page">
      <PageHeader
        title={selected ? `${selected.name} history` : 'Tracker history'}
        description="Recorded values and trends. History stays available when coaching ends."
        back={{to: generatePath(routes.clientTrackers, {clientId}), label: 'Back to client Trackers'}}
        actions={
          <Link
            className={buttonVariants()}
            to={`${generatePath(routes.recordTracker, {clientId})}${id ? `?tracker_id=${id}` : ''}`}
          >
            Record for client
          </Link>
        }
      />
      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          onPress={() => setPicking(!picking)}
        >
          Choose Tracker
        </Button>
        {id && (
          <Button
            variant="ghost"
            onPress={() => setFilter('tracker_id', '')}
          >
            Show all entries
          </Button>
        )}
      </div>
      {picking && (
        <TrackerPicker
          onSelect={(value) => {
            setFilter('tracker_id', value.id);
            setPicking(false);
          }}
        />
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <label
          htmlFor="tracker-from"
          className="grid gap-2 text-sm font-medium"
        >
          From
          <Input
            id="tracker-from"
            type="date"
            value={from}
            onChange={(event) => setFilter('from', event.target.value)}
          />
        </label>
        <label
          htmlFor="tracker-to"
          className="grid gap-2 text-sm font-medium"
        >
          To
          <Input
            id="tracker-to"
            type="date"
            value={to}
            onChange={(event) => setFilter('to', event.target.value)}
          />
        </label>
        {selected && selected.units.length > 1 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Display unit</p>
            <SelectField
              aria-label="Display unit"
              value={unit}
              onChange={(value) => setChosenUnit({id, unit: value})}
            >
              {selected.units.map((option) => (
                <SelectItem
                  key={option.unit}
                  id={option.unit}
                >
                  {option.unit}
                </SelectItem>
              ))}
            </SelectField>
          </div>
        )}
      </div>
      {id && (
        <section className="space-y-4">
          <h2 className="section-title">Metrics</h2>
          {metrics.isPending && <p role="status">Loading metrics…</p>}
          {metrics.isError && (
            <>
              <FormError message="Could not refresh metrics. Loaded results remain visible." />
              <Button
                variant="outline"
                onPress={() => {
                  metrics.refetch();
                }}
              >
                Retry metrics
              </Button>
            </>
          )}
          {metrics.data && (
            <TrackerMetricsDisplay
              value={metrics.data.data}
              unit={unit}
            />
          )}
        </section>
      )}
      <section className="space-y-4">
        <h2 className="section-title">Entries</h2>
        <InfiniteList
          query={entries}
          label="Tracker entries"
          singular="Tracker entry"
          empty={<Surface>No entries exist in this range.</Surface>}
        >
          {(entry) => (
            <Entry
              entry={entry}
              clientId={clientId}
              unit={id ? unit : defaultTrackerUnit(entry.tracker, person.data?.data.unit_system ?? 'metric')}
            />
          )}
        </InfiniteList>
      </section>
    </Page>
  );
}

function Entry({entry, unit, clientId}: {entry: TrackerEntry; unit: string; clientId: string}) {
  return (
    <article className="space-y-3 p-5">
      <div className="flex flex-wrap justify-between gap-2">
        <h3 className="font-semibold break-words">
          <Link
            className="text-link"
            to={`${generatePath(routes.trackerHistory, {clientId})}?tracker_id=${entry.tracker.id}`}
          >
            {entry.tracker.name}
          </Link>
        </h3>
        <time
          className="text-sm"
          dateTime={entry.local_date}
        >
          {entry.local_date}
        </time>
      </div>
      <p className="whitespace-pre-wrap break-words">{entryValue(entry, unit)}</p>
      <p className="text-sm text-muted-foreground">
        {entry.recorded_by_type === 'coach' ? 'Recorded by coach' : 'Recorded by client'}
        {entry.about_session_id ? ' · After workout' : entry.about_meal_id ? ' · After meal' : ''}
      </p>
      {entry.attachments.length > 0 && <TrackerEntryFiles entry={entry} />}
    </article>
  );
}

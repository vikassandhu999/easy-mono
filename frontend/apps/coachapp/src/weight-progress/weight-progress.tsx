import {addDays, formatDateLong} from '@easy/utils';
import {useForm} from 'react-hook-form';
import {generatePath, useParams, useSearchParams} from 'react-router-dom';
import {errorMessage} from '../api/client';
import {useClient} from '../api/clients';
import {useWeightProgress, type WeightProgressFilters} from '../api/weight-progress';
import {routes} from '../routes';
import {Button} from '../ui/button';
import {FormError} from '../ui/form-error';
import {FormField} from '../ui/form-field';
import {InfiniteList} from '../ui/infinite-list';
import {Page, PageHeader, StatusBadge, Surface} from '../ui/page';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';
import {WeightTrend} from './weight-trend';

export function WeightProgress() {
  const {clientId = ''} = useParams();
  return (
    <Progress
      key={clientId}
      clientId={clientId}
    />
  );
}

function Progress({clientId}: {clientId: string}) {
  const client = useClient(clientId);
  const [params, setParams] = useSearchParams();
  const rawUnit = params.get('unit');
  const filters: WeightProgressFilters = {
    ...(params.get('from') ? {from: params.get('from') || ''} : {}),
    ...(params.get('to') ? {to: params.get('to') || ''} : {}),
    ...(rawUnit === 'kg' || rawUnit === 'lbs' ? {unit: rawUnit} : {}),
  };
  const query = useWeightProgress(clientId, filters);
  const progress = query.data?.pages.at(-1);
  const person = client.data?.data;
  const name = person
    ? `${person.first_name ?? ''} ${person.last_name ?? ''}`.trim() || person.email || 'Client'
    : 'Client';
  const from = filters.from ?? progress?.from ?? '';
  const to = filters.to ?? progress?.to ?? '';
  return (
    <Page>
      <PageHeader
        title={`Weight progress for ${name}`}
        description="Review measurements and the change over time."
        back={{to: generatePath(routes.client, {id: clientId}), label: 'Back to client'}}
      />
      {!person ? (
        <Surface>
          {client.isPending ? (
            <p role="status">Loading client…</p>
          ) : (
            <div className="space-y-4">
              <FormError message={errorMessage(client.error, 'Could not load this client.')} />
              <Button
                onPress={() => {
                  client.refetch();
                }}
              >
                Try again
              </Button>
            </div>
          )}
        </Surface>
      ) : (
        <>
          <div className="space-y-4">
            <DateRange
              key={`${from}:${to}`}
              from={from}
              to={to}
              onApply={(range) =>
                setParams(
                  (previous) => {
                    const next = new URLSearchParams(previous);
                    next.set('from', range.from);
                    next.set('to', range.to);
                    return next;
                  },
                  {replace: true},
                )
              }
            />
            <div className="flex flex-wrap items-end gap-3">
              <div className="grid w-44 gap-2">
                <span
                  id="weight-unit-label"
                  className="text-sm font-medium"
                >
                  Trend unit
                </span>
                <SelectField
                  id="weight-unit"
                  value={filters.unit ?? progress?.unit ?? ''}
                  onChange={(value) =>
                    setParams(
                      (previous) => {
                        const next = new URLSearchParams(previous);
                        if (value === 'kg' || value === 'lbs') {
                          next.set('unit', value);
                        }
                        return next;
                      },
                      {replace: true},
                    )
                  }
                >
                  <SelectItem id="kg">Kilograms (kg)</SelectItem>
                  <SelectItem id="lbs">Pounds (lbs)</SelectItem>
                </SelectField>
              </div>
              {(filters.from || filters.to) && (
                <Button
                  variant="ghost"
                  onPress={() =>
                    setParams(
                      (previous) => {
                        const next = new URLSearchParams(previous);
                        next.delete('from');
                        next.delete('to');
                        return next;
                      },
                      {replace: true},
                    )
                  }
                >
                  Last 90 days
                </Button>
              )}
            </div>
          </div>
          {progress && <WeightTrend progress={progress} />}
          <section
            className="space-y-4"
            aria-label="Measurement history"
          >
            <div>
              <h2 className="section-title">Measurement history</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Every reading keeps its recorded unit. Most recent dates appear first.
              </p>
            </div>
            <InfiniteList
              query={query}
              label="measurements"
              singular="measurement"
              empty={
                <Surface>
                  <h3 className="section-title">No measurements in this range</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Choose another date range, or return after your client records a weight or submits a form with a
                    weight answer.
                  </p>
                </Surface>
              }
            >
              {(entry) => (
                <div className="space-y-3 p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <h3 className="text-xl font-semibold">
                      {entry.value} {entry.unit}
                    </h3>
                    <time
                      dateTime={entry.date}
                      className="text-sm"
                    >
                      {formatDateLong(entry.date)}
                    </time>
                  </div>
                  <StatusBadge>{entry.form_submission_id ? 'Form response' : 'Client entry'}</StatusBadge>
                  {entry.note && (
                    <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{entry.note}</p>
                  )}
                </div>
              )}
            </InfiniteList>
          </section>
        </>
      )}
    </Page>
  );
}

type Range = Required<Pick<WeightProgressFilters, 'from' | 'to'>>;
function DateRange({from, to, onApply}: Range & {onApply: (range: Range) => void}) {
  const form = useForm<Range>({defaultValues: {from, to}});
  return (
    <form
      noValidate
      className="grid grid-cols-2 items-start gap-3 sm:grid-cols-[12rem_12rem_auto]"
      onSubmit={form.handleSubmit((range) => {
        if (range.to < range.from) {
          form.setError('to', {message: 'End date must be on or after start date.'}, {shouldFocus: true});
          return;
        }
        if (addDays(range.from, 365).toString() < range.to) {
          form.setError('to', {message: 'Choose a date range of up to one year.'}, {shouldFocus: true});
          return;
        }
        onApply(range);
      })}
    >
      <FormField
        control={form.control}
        name="from"
        label="From date"
        type="date"
        isRequired
      />
      <FormField
        control={form.control}
        name="to"
        label="To date"
        type="date"
        isRequired
      />
      <Button
        type="submit"
        variant="outline"
        className="col-span-2 sm:col-span-1 sm:mt-7"
      >
        Apply dates
      </Button>
    </form>
  );
}

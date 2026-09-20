import {ArrowUpRight, ChevronRight, Plus, SlidersHorizontal, Sprout} from 'lucide-react';
import {useState} from 'react';
import {useForm} from 'react-hook-form';
import {generatePath, Link, useSearchParams} from 'react-router-dom';
import {useProfile} from '../api/auth';
import {useWeightProgress, type WeightFilters, type WeightProgress} from '../api/weight';
import {routes} from '../routes';
import {BottomSheet} from '../ui/bottom-sheet';
import {Button, buttonVariants} from '../ui/button';
import {CachedRead} from '../ui/cached-read';
import {FormField} from '../ui/form-field';
import {InfiniteList} from '../ui/infinite-list';
import {Page} from '../ui/page';
import {ReadState} from '../ui/read-state';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';
import {isDay, shiftDay, weightDate} from './weight-draft';

export function Progress() {
  const profile = useProfile();
  return (
    <Page
      title="Weight & progress"
      back={routes.home}
      compact
    >
      {profile.data ? (
        <WeightHistory
          today={profile.data.data.local_date}
          defaultUnit={profile.data.data.default_weight_unit === 'lbs' ? 'lbs' : 'kg'}
        />
      ) : (
        <ReadState
          label="your progress"
          failed={profile.isError}
          retry={() => {
            profile.refetch();
          }}
        />
      )}
    </Page>
  );
}

function WeightHistory({today, defaultUnit}: {today: string; defaultUnit: WeightFilters['unit']}) {
  const [showFilters, setShowFilters] = useState(false);
  const [params, setParams] = useSearchParams();
  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';
  const filters: WeightFilters = {
    from: isDay(from) ? from : shiftDay(today, -89),
    to: isDay(to) ? to : today,
    unit: params.get('unit') === 'lbs' ? 'lbs' : params.get('unit') === 'kg' ? 'kg' : defaultUnit,
  };
  const query = useWeightProgress(filters);
  const progress = query.data?.pages.at(-1);
  const recordPath = (date: string) =>
    `${generatePath(routes.weight, {date})}?${new URLSearchParams({returnTo: routes.progress + '?' + params.toString()})}`;
  return (
    <div className="space-y-7">
      {params.get('saved') && <p role="status">Your weight is saved.</p>}
      {params.get('deleted') && <p role="status">Your weight record was removed.</p>}
      <Button
        variant="outline"
        className="rounded-full gap-2 text-sm"
        onPress={() => setShowFilters(true)}
      >
        <SlidersHorizontal
          className="size-4"
          aria-hidden="true"
        />
        Date range & units
      </Button>
      {showFilters && (
        <BottomSheet
          title="Your progress view"
          onClose={() => setShowFilters(false)}
        >
          <HistoryFilters
            filters={filters}
            onApply={(value) => {
              setParams(value);
              setShowFilters(false);
            }}
          />
        </BottomSheet>
      )}
      {progress && (
        <>
          <CachedRead
            updatedAt={query.dataUpdatedAt}
            failed={query.isError}
            refreshing={query.isFetching}
            refresh={() => query.refetch()}
          />
          <WeightSummary progress={progress} />
        </>
      )}
      <Link
        to={recordPath(today)}
        className={buttonVariants({className: 'w-full gap-2'})}
      >
        <Plus
          className="size-5"
          aria-hidden="true"
        />
        Record weight
      </Link>
      <section
        aria-label="Weight history"
        className="space-y-3"
      >
        <h2 className="text-xl font-bold tracking-tight">Your records</h2>
        <p className="text-sm text-muted-foreground">
          {weightDate(filters.from)} – {weightDate(filters.to)}
        </p>
        <InfiniteList
          query={query}
          label="weight records"
          singular="weight record"
          empty={
            <div className="rounded-3xl bg-[var(--progress)] px-5 py-7 text-center space-y-3">
              <Sprout
                className="size-9 mx-auto"
                aria-hidden="true"
              />
              <p className="text-lg font-bold">A little check-in with yourself</p>
              <p className="text-sm">No weights in this date range. Add a record whenever you’re ready.</p>
            </div>
          }
        >
          {(entry) => {
            const destination = entry.form_assignment_id
              ? `${generatePath(routes.form, {id: entry.form_assignment_id})}?${new URLSearchParams({returnTo: routes.progress + '?' + params.toString()})}`
              : entry.form_submission_id
                ? null
                : recordPath(entry.date);
            const content = (
              <>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-semibold">{weightDate(entry.date)}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.form_submission_id ? 'From your check-in' : 'Your entry'}
                  </p>
                  {entry.note && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{entry.note}</p>
                  )}
                </div>
                <p className="text-xl font-bold tabular-nums whitespace-nowrap">
                  {entry.value} <span className="text-sm font-normal">{entry.unit}</span>
                </p>
                {destination && (
                  <ChevronRight
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                )}
              </>
            );
            return destination ? (
              <Link
                className="flex items-center gap-3 py-5"
                to={destination}
                aria-label={`${entry.form_submission_id ? 'View check-in response' : 'Edit weight'} · ${weightDate(entry.date)} · ${entry.value} ${entry.unit}`}
              >
                {content}
              </Link>
            ) : (
              <div className="flex items-center gap-3 py-5">{content}</div>
            );
          }}
        </InfiniteList>
      </section>
      <Link
        className="flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-surface px-4 font-semibold"
        to={routes.account}
      >
        Your account
        <ArrowUpRight
          className="size-5"
          aria-hidden="true"
        />
      </Link>
    </div>
  );
}

function HistoryFilters({filters, onApply}: {filters: WeightFilters; onApply: (filters: WeightFilters) => void}) {
  const form = useForm<WeightFilters>({defaultValues: filters});
  return (
    <form
      className="space-y-5"
      noValidate
      onSubmit={form.handleSubmit(onApply)}
    >
      <FormField
        control={form.control}
        name="from"
        label="From date"
        type="date"
        isRequired
        rules={{validate: (value) => isDay(value) || 'Choose a valid date.'}}
      />
      <FormField
        control={form.control}
        name="to"
        label="To date"
        type="date"
        isRequired
        rules={{
          validate: (value) =>
            (isDay(value) &&
              isDay(form.getValues('from')) &&
              value >= form.getValues('from') &&
              value <= shiftDay(form.getValues('from'), 365)) ||
            'Choose a range of up to one year.',
        }}
      />
      <SelectField
        aria-label="Display unit"
        value={form.watch('unit')}
        onChange={(value) => {
          if (value === 'kg' || value === 'lbs') {
            form.setValue('unit', value);
          }
        }}
      >
        <SelectItem id="kg">Kilograms (kg)</SelectItem>
        <SelectItem id="lbs">Pounds (lb)</SelectItem>
      </SelectField>
      <Button
        type="submit"
        className="w-full"
      >
        Apply range
      </Button>
    </form>
  );
}

function WeightSummary({progress}: {progress: WeightProgress}) {
  const {summary, chart, unit, goal} = progress;
  const latest = summary.latest_entry;
  if (!latest) {
    return null;
  }
  const points = chart.points;
  const minimum = chart.min;
  const maximum = chart.max;
  const span = new Date(progress.to).getTime() - new Date(progress.from).getTime();
  const plot =
    minimum !== null && maximum !== null && maximum > minimum
      ? points.map((point) => ({
          id: point.id,
          x: span ? 12 + (296 * (new Date(point.date).getTime() - new Date(progress.from).getTime())) / span : 160,
          y: 148 - (128 * (point.value - minimum)) / (maximum - minimum),
        }))
      : [];
  return (
    <section
      aria-label="Weight trend"
      className="space-y-4 rounded-[2rem] bg-[var(--progress)] p-5"
    >
      <div>
        <p className="text-sm text-muted-foreground">Latest in this range · {weightDate(latest.date)}</p>
        <p className="text-5xl font-bold tracking-tight tabular-nums mt-2">
          {latest.value} <span className="text-lg font-normal">{unit}</span>
        </p>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        {summary.total_change !== null && (
          <p>
            Change{' '}
            <strong>
              {summary.total_change > 0 ? '+' : ''}
              {summary.total_change} {unit}
            </strong>
          </p>
        )}
        {goal && (
          <p>
            Goal{' '}
            <strong>
              {goal.value} {goal.unit}
            </strong>
          </p>
        )}
      </div>
      {plot.length > 1 && (
        <figure>
          <svg
            viewBox="0 0 320 164"
            role="img"
            aria-label={`Weight trend in ${unit}. Measurements are listed below.`}
            className="w-full text-primary"
          >
            <title>Weight trend</title>
            <path
              d="M12 148H308"
              stroke="currentColor"
              opacity="0.2"
            />
            <polyline
              points={plot.map((point) => `${point.x},${point.y}`).join(' ')}
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {plot.map((point) => (
              <circle
                key={point.id}
                cx={point.x}
                cy={point.y}
                r="3"
                fill="currentColor"
              />
            ))}
          </svg>
          <figcaption className="text-xs text-muted-foreground">
            Latest measurement each day. Records below retain their original units.
          </figcaption>
        </figure>
      )}
      {plot.length === 1 && (
        <p className="text-sm text-muted-foreground">
          Your first point in this range. Your trend grows as you add records.
        </p>
      )}
    </section>
  );
}

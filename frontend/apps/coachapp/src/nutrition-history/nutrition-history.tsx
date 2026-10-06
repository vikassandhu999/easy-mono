import {addDays, formatDateDisplay} from '@easy/utils';
import {useState} from 'react';
import {generatePath, useParams, useSearchParams} from 'react-router-dom';
import {errorMessage} from '../api/client';
import {useClient} from '../api/clients';
import {useNutritionDay, useNutritionDays, useNutritionFoodMetrics} from '../api/nutrition-days';
import {nutrientFields} from '../api/nutrition-values';
import {routes} from '../routes';
import {Button} from '../ui/button';
import {FormError} from '../ui/form-error';
import {Input} from '../ui/input';
import {Page, PageHeader, Surface} from '../ui/page';
import {DayTotals, MealRecord, RecordedMeal} from './nutrition-day';

export function NutritionHistory() {
  const {clientId = ''} = useParams();
  const [params, setParams] = useSearchParams();
  const [selectedView, setView] = useState<'day' | 'week'>('day');
  const rangeActive = Boolean(params.get('from') && params.get('to'));
  const view = rangeActive ? 'range' : selectedView;
  const date = params.get('date') || undefined;
  const client = useClient(clientId);
  const dayQuery = useNutritionDay(clientId, date);
  const day = dayQuery.data?.data[0];
  const selected = day?.date ?? date ?? client.data?.data.local_date ?? '';
  const weekday = selected ? (new Date(`${selected}T12:00:00Z`).getUTCDay() + 6) % 7 : 0;
  const from = params.get('from') || (selected ? addDays(selected, -weekday).toString() : '');
  const to = params.get('to') || (from ? addDays(from, 6).toString() : '');
  const week = useNutritionDays(clientId, from, to);
  const metrics = useNutritionFoodMetrics(clientId, from, to);
  const person = client.data?.data;
  const days = view === 'day' ? (day ? [day] : []) : (week.data?.data ?? []);
  const query = view === 'day' ? dayQuery : week;
  return (
    <Page className="client-page">
      <PageHeader
        title={`Nutrition for ${person?.preferred_name || person?.full_name || 'client'}`}
        description="Expected meals, recorded intake, and the target in force."
        back={{to: generatePath(routes.client, {id: clientId}), label: 'Back to client'}}
      />
      <div className="flex flex-wrap items-end gap-3">
        <label
          htmlFor="nutrition-history-date"
          className="grid gap-2 text-sm font-medium"
        >
          Date
          <Input
            id="nutrition-history-date"
            type="date"
            value={selected}
            onChange={(event) => {
              if (event.target.value) {
                setParams({date: event.target.value});
              }
            }}
          />
        </label>
        <Button
          variant="outline"
          isDisabled={!selected}
          onPress={() => setParams({date: addDays(selected, view === 'day' ? -1 : -7).toString()})}
        >
          Previous {view}
        </Button>
        <Button
          variant="outline"
          isDisabled={!selected}
          onPress={() => setParams({date: addDays(selected, view === 'day' ? 1 : 7).toString()})}
        >
          Next {view}
        </Button>
        <Button
          variant="ghost"
          onPress={() => setParams({})}
        >
          Today
        </Button>
        <Button
          variant="ghost"
          isPending={query.isFetching}
          onPress={() => {
            query.refetch();
            metrics.refetch();
          }}
        >
          Refresh
        </Button>
      </div>
      {rangeActive && (
        <p role="status">
          Summary range: {from} to {to}
        </p>
      )}
      <div
        role="group"
        aria-label="Nutrition view"
        className="flex gap-2"
      >
        <Button
          variant={view === 'day' ? 'secondary' : 'ghost'}
          aria-pressed={view === 'day'}
          onPress={() => {
            setView('day');
            if (rangeActive) {
              setParams({date: from});
            }
          }}
        >
          Day view
        </Button>
        <Button
          variant={view === 'week' ? 'secondary' : 'ghost'}
          aria-pressed={view === 'week'}
          onPress={() => {
            setView('week');
            if (rangeActive) {
              setParams({date: from});
            }
          }}
        >
          Week view
        </Button>
      </div>
      {query.isError && (
        <div className="space-y-3">
          <FormError
            message={errorMessage(query.error, 'Could not load nutrition. Previously loaded records remain visible.')}
          />
          <Button
            variant="outline"
            onPress={() => {
              query.refetch();
            }}
          >
            Try again
          </Button>
        </div>
      )}
      {query.isPending && <p role="status">Loading nutrition…</p>}
      <div className={view === 'week' ? 'grid min-w-0 gap-6 lg:grid-cols-2' : 'space-y-8'}>
        {days.map((value) => (
          <section
            key={value.date}
            className="min-w-0 space-y-5"
          >
            <div>
              <h2 className="text-xl font-semibold">
                <time dateTime={value.date}>{formatDateDisplay(value.date)}</time>
              </h2>
              <p className="text-xs text-muted-foreground">{value.timezone.replaceAll('_', ' ')}</p>
            </div>
            <DayTotals day={value} />
            {view === 'week' ? (
              <ul className="space-y-2 text-sm">
                {value.slots.map((slot) => (
                  <li
                    key={slot.id}
                    className="flex justify-between gap-3"
                  >
                    <span>{slot.name}</span>
                    <span className="text-muted-foreground">
                      {slot.status === 'recorded' ? 'Recorded' : 'Not recorded'}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <>
                {value.slots.map((slot) => (
                  <MealRecord
                    key={slot.id}
                    slot={slot}
                  />
                ))}
                {value.extra_meals.map((meal) => (
                  <section
                    key={meal.id}
                    className="space-y-3"
                  >
                    <h2 className="section-title">{meal.name} · Extra meal</h2>
                    <RecordedMeal meal={meal} />
                  </section>
                ))}
                {value.slots.length === 0 && value.extra_meals.length === 0 && (
                  <p className="text-sm text-muted-foreground">No planned or recorded meals for this day.</p>
                )}
              </>
            )}
          </section>
        ))}
      </div>
      <section className="client-section space-y-4">
        <h2 className="section-title">Food metrics</h2>
        <p className="text-sm text-muted-foreground">
          {from} to {to}. Includes foods recorded directly and foods in recorded recipes.
        </p>
        {metrics.isPending && <p role="status">Loading food metrics…</p>}
        {metrics.isError && (
          <div className="space-y-3">
            <FormError message="Could not load food metrics." />
            <Button
              variant="outline"
              onPress={() => {
                metrics.refetch();
              }}
            >
              Retry food metrics
            </Button>
          </div>
        )}
        {metrics.data?.data.length === 0 && (
          <p className="text-sm text-muted-foreground">No foods recorded in this date range.</p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {metrics.data?.data.map((food) => (
            <Surface
              key={food.food_id}
              className="space-y-3"
            >
              <h3 className="editor-item-title">{food.name}</h3>
              <p className="text-sm">
                {food.entries_count} entries across {food.days_count} days · Average{' '}
                {Math.round(food.average_grams * 10) / 10} g
              </p>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                {nutrientFields.map(([code, name, unit]) => (
                  <div key={code}>
                    <dt className="text-xs text-muted-foreground">{name} supplied</dt>
                    <dd>
                      {food.nutrients[code]?.value == null
                        ? 'Unknown'
                        : `${Math.round((food.nutrients[code]?.value ?? 0) * 10) / 10} ${unit}`}
                    </dd>
                  </div>
                ))}
              </dl>
            </Surface>
          ))}
        </div>
      </section>
    </Page>
  );
}

import {addDays} from '@easy/utils';
import {Check, ChevronLeft, ChevronRight, Utensils} from 'lucide-react';
import {generatePath, Link, Navigate, useParams, useSearchParams} from 'react-router-dom';
import {type NutrientMap, type NutritionDay, useNutritionDay, useNutritionPlan} from '../api/nutrition';
import {safeReturnTo} from '../auth/return-to';
import {routes} from '../routes';
import {dayLabel} from '../training/recording';
import {ActionCard} from '../ui/action-card';
import {Button} from '../ui/button';
import {CachedRead} from '../ui/cached-read';
import {useCoaching} from '../ui/coaching';
import {Page} from '../ui/page';
import {ReadState} from '../ui/read-state';
import {portionText} from './meal-draft';

const nutrientLabels = [
  ['energy_kcal', 'Energy', 'kcal'],
  ['protein_g', 'Protein', 'g'],
  ['carbs_g', 'Carbs', 'g'],
  ['fat_g', 'Fat', 'g'],
  ['fiber_g', 'Fiber', 'g'],
  ['sugar_g', 'Sugar', 'g'],
] as const;
const number = (value: number) => Math.round(value * 10) / 10;

export function Nutrients({value, label}: {value: NutrientMap; label: string}) {
  return (
    <div className="space-y-2">
      <p className="font-semibold">{label}</p>
      <p className="text-sm text-muted-foreground">
        {nutrientLabels
          .map(
            ([code, name, unit]) =>
              `${name}: ${value[code] === undefined ? 'Unknown' : `${number(value[code])} ${unit}`}`,
          )
          .join(' · ')}
      </p>
    </div>
  );
}
function Targets({targets}: {targets: NutritionDay['targets']}) {
  return (
    <dl className="space-y-1">
      {nutrientLabels.map(([code, name, unit]) => {
        const target = targets[code];
        if (!target) {
          return null;
        }
        return (
          <div
            key={code}
            className="flex justify-between gap-3 text-sm"
          >
            <dt>{name}</dt>
            <dd>
              {target.min === target.max
                ? `${target.min}`
                : target.min == null
                  ? `At most ${target.max}`
                  : target.max == null
                    ? `At least ${target.min}`
                    : `${target.min}–${target.max}`}{' '}
              {unit}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
export function TodayNutrition() {
  const {canWrite} = useCoaching();
  const query = useNutritionDay();
  const day = query.data?.data;
  return (
    <section className="mb-4 space-y-3">
      {day ? (
        <>
          <CachedRead
            updatedAt={query.dataUpdatedAt}
            failed={query.isError}
            refreshing={query.isFetching}
            refresh={() => query.refetch()}
          />
          <ActionCard
            title={canWrite ? 'Today’s meals' : 'Meal history'}
            eyebrow="Nutrition"
            to={routes.nutrition}
            tone="nutrition"
            icon={<Utensils />}
            description={
              canWrite
                ? `${day.counts.recorded} recorded · ${day.counts.expected} planned meals`
                : 'Read your saved meals and notes.'
            }
          />
          {day.slots.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {day.slots
                .map((slot) => `${slot.name}: ${slot.status === 'recorded' ? 'Recorded' : 'Not recorded'}`)
                .join(' · ')}
            </p>
          )}
        </>
      ) : (
        <ReadState
          label="today's nutrition"
          failed={query.isError}
          retry={() => {
            query.refetch();
          }}
        />
      )}
    </section>
  );
}
export function Nutrition() {
  const [params, setParams] = useSearchParams();
  const query = useNutritionDay(params.get('date') || undefined);
  const day = query.data?.data;
  return (
    <Page
      title="Nutrition"
      description="Your meals and daily targets."
      compact
    >
      {day && (
        <div className="mb-5 flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Previous day"
            onPress={() => setParams({date: addDays(day.date, -1).toString()})}
          >
            <ChevronLeft />
          </Button>
          <label className="min-w-0 flex-1 text-sm">
            Nutrition day
            <input
              aria-label="Nutrition day"
              type="date"
              className="block h-12 w-full rounded-xl border border-border px-2 text-base"
              value={day.date}
              onChange={(event) => {
                if (event.target.value) {
                  setParams({date: event.target.value});
                }
              }}
            />
          </label>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Next day"
            onPress={() => setParams({date: addDays(day.date, 1).toString()})}
          >
            <ChevronRight />
          </Button>
        </div>
      )}
      {!day ? (
        <ReadState
          label="your meals"
          failed={query.isError}
          retry={() => {
            query.refetch();
          }}
        />
      ) : (
        <>
          <CachedRead
            updatedAt={query.dataUpdatedAt}
            failed={query.isError}
            refreshing={query.isFetching}
            refresh={() => query.refetch()}
          />
          {params.has('saved') && (
            <p
              role="status"
              className="mb-4 font-semibold text-primary"
            >
              Meal saved.
            </p>
          )}
          <DayOverview day={day} />
        </>
      )}
    </Page>
  );
}
function DayOverview({day}: {day: NutritionDay}) {
  const {canWrite} = useCoaching();
  return (
    <>
      <section className="mb-6 space-y-4 rounded-3xl bg-[var(--nutrition)] p-5">
        <h2 className="text-xl font-bold">
          {day.counts.recorded} recorded · {day.counts.expected} planned
        </h2>
        <dl className="space-y-2">
          {nutrientLabels.map(([code, name, unit]) => {
            const total = day.totals[code];
            return (
              <div
                key={code}
                className="flex justify-between gap-3 text-sm"
              >
                <dt>{name}</dt>
                <dd className="text-right">
                  {total?.value == null ? 'Unknown' : `${number(total.value)} ${unit}`}
                  <span className="block text-xs text-muted-foreground">
                    {total?.known_entries ?? 0} of {total?.total_entries ?? 0} entries known
                  </span>
                </dd>
              </div>
            );
          })}
        </dl>
        <details>
          <summary className="min-h-11 cursor-pointer py-3 font-semibold">Daily targets</summary>
          <Targets targets={day.targets} />
          {day.plan_revision_number !== null && (
            <p className="mt-2 text-xs text-muted-foreground">Target revision {day.plan_revision_number}</p>
          )}
          {day.target_changed && (
            <p
              role="status"
              className="mt-3 text-sm"
            >
              The target changed today. These targets apply at the end of the day.
            </p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">{day.timezone.replaceAll('_', ' ')}</p>
        </details>
        {day.plan_id && (
          <Link
            className="inline-flex min-h-11 items-center font-semibold text-primary"
            to={generatePath(routes.nutritionPlan, {id: day.plan_id})}
          >
            View plan
          </Link>
        )}
      </section>
      {(!canWrite || !day.write_eligible) && <p className="mb-4 text-muted-foreground">This day is read-only.</p>}
      <ul className="divide-y divide-border">
        {day.slots.map((slot) => (
          <li key={slot.id}>
            <Link
              className="flex items-center gap-3 py-5"
              to={generatePath(routes.nutritionMeal, {date: day.date, slot: slot.id})}
            >
              {slot.meal ? (
                <Check className="size-5 shrink-0 text-primary" />
              ) : (
                <Utensils className="size-5 shrink-0" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block text-xl font-bold">{slot.name}</span>
                <span className="block text-sm text-muted-foreground">
                  {slot.status === 'recorded' ? 'Recorded' : 'Not recorded'}
                </span>
              </span>
              <ChevronRight className="size-5 shrink-0" />
            </Link>
          </li>
        ))}
        {day.extra_meals.map((meal) => (
          <li key={meal.id}>
            <Link
              className="block py-5"
              to={generatePath(routes.nutritionMeal, {date: day.date, slot: meal.id})}
            >
              <span className="block text-xl font-bold">{meal.name}</span>
              <span className="text-sm text-muted-foreground">Recorded · Extra meal</span>
            </Link>
          </li>
        ))}
      </ul>
      {day.slots.length + day.extra_meals.length === 0 && (
        <p className="mb-5 text-muted-foreground">No meals planned or recorded.</p>
      )}
      {canWrite && day.write_eligible && (
        <Link
          className="mt-4 flex min-h-12 items-center justify-center rounded-xl border border-border font-semibold"
          to={generatePath(routes.nutritionMeal, {date: day.date, slot: 'new'})}
        >
          Record another meal
        </Link>
      )}
    </>
  );
}
export function CurrentNutritionPlan() {
  const query = useNutritionDay();
  if (query.data?.data.plan_id) {
    return (
      <Navigate
        to={generatePath(routes.nutritionPlan, {id: query.data.data.plan_id})}
        replace
      />
    );
  }
  return (
    <Page
      title="Your nutrition plan"
      back={routes.nutrition}
      compact
    >
      {!query.data ? (
        <ReadState
          label="your nutrition plan"
          failed={query.isError}
          retry={() => {
            query.refetch();
          }}
        />
      ) : (
        <p>No nutrition plan applies today. Your meal history is still available.</p>
      )}
    </Page>
  );
}
export function NutritionPlan() {
  const {id = ''} = useParams();
  const [params] = useSearchParams();
  const query = useNutritionPlan(id);
  const plan = query.data?.data;
  return (
    <Page
      title={plan?.name ?? 'Nutrition plan'}
      description={plan?.description ?? undefined}
      back={params.has('returnTo') ? safeReturnTo(params.get('returnTo')) : routes.nutrition}
      compact
    >
      {!plan ? (
        <ReadState
          label="your plan"
          failed={query.isError}
          retry={() => {
            query.refetch();
          }}
        />
      ) : (
        <>
          <CachedRead
            updatedAt={query.dataUpdatedAt}
            failed={query.isError}
            refreshing={query.isFetching}
            refresh={() => query.refetch()}
          />
          <p className="mb-4 text-muted-foreground">
            {plan.start_date ? `From ${dayLabel(plan.start_date)}` : 'No start date'}
          </p>
          <section className="mb-6 space-y-3 rounded-3xl bg-[var(--nutrition)] p-5">
            <h2 className="text-xl font-semibold">Daily targets</h2>
            <Targets targets={plan.content.targets} />
          </section>
          <h2 className="mb-3 text-xl font-semibold">Weekly guidance</h2>
          <dl className="mb-6 divide-y divide-border">
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, index) => {
              const entry = plan.content.schedule.entries.find((entry) => entry.day === index + 1);
              return (
                <div
                  key={day}
                  className="flex justify-between gap-3 py-3"
                >
                  <dt>{day}</dt>
                  <dd>
                    {plan.content.day_patterns.find((pattern) => pattern.id === entry?.ref)?.name ?? 'No guidance'}
                  </dd>
                </div>
              );
            })}
          </dl>
          {plan.content.day_patterns.map((pattern) => (
            <section
              key={pattern.id}
              className="mb-6 space-y-3"
            >
              <h2 className="text-xl font-semibold">{pattern.name}</h2>
              {pattern.targets && <Targets targets={pattern.targets} />}
              {pattern.slots.map((slot) => (
                <div
                  key={slot.id}
                  className="rounded-2xl bg-surface p-4"
                >
                  <h3 className="font-semibold">{slot.name}</h3>
                  <p>
                    {slot.meal_ids.map((id) => plan.content.meals.find((meal) => meal.id === id)?.name).join(' or ')}
                  </p>
                </div>
              ))}
            </section>
          ))}
          <h2 className="text-xl font-semibold">Meals</h2>
          {plan.content.meals.map((meal) => (
            <details
              key={meal.id}
              className="mt-3 rounded-3xl bg-surface px-5 py-3"
            >
              <summary className="min-h-12 cursor-pointer py-3 text-lg font-bold">{meal.name}</summary>
              {meal.notes && <p className="whitespace-pre-wrap">{meal.notes}</p>}
              <ul className="space-y-3 py-3">
                {meal.items.map((item) => (
                  <li key={item.id}>
                    <p>
                      {item.name} · {portionText(item.portion)}
                    </p>
                    {item.nutrients && (
                      <Nutrients
                        label="Planned portion"
                        value={item.nutrients}
                      />
                    )}
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </>
      )}
    </Page>
  );
}

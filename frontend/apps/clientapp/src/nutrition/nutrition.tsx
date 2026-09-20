import {addDays} from '@easy/utils';
import {CalendarDays, Check, ChevronLeft, ChevronRight, Plus, Utensils} from 'lucide-react';
import {useState} from 'react';
import {generatePath, Link, Navigate, useParams, useSearchParams} from 'react-router-dom';
import {type Day, type FoodNutrients, useNutritionDay, useNutritionPlan} from '../api/nutrition';
import {safeReturnTo} from '../auth/return-to';
import {routes} from '../routes';
import {dayLabel} from '../training/recording';
import {ActionCard} from '../ui/action-card';
import {BottomSheet} from '../ui/bottom-sheet';
import {Button} from '../ui/button';
import {CachedRead} from '../ui/cached-read';
import {Page} from '../ui/page';
import {ReadState} from '../ui/read-state';
import {mealSlots, portionText, slotLabel} from './meal-draft';

const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

export function Nutrients({
  value,
  label,
  prominent = false,
}: {
  value: FoodNutrients;
  label: string;
  prominent?: boolean;
}) {
  return (
    <div className="space-y-1">
      <p className={prominent ? 'space-y-1' : 'font-medium'}>
        <span className={prominent ? 'block text-sm font-semibold' : undefined}>{label}: </span>
        <span className={prominent ? 'block text-3xl font-extrabold tracking-tight' : undefined}>
          {value.calories === null ? 'Calories unavailable' : `${value.calories} kcal`}
        </span>
      </p>
      <p className="text-sm text-muted-foreground">
        Protein {value.protein ?? '—'} g · Carbs {value.carbohydrates ?? '—'} g · Fat {value.fat ?? '—'} g
      </p>
      {!value.complete && <p className="text-sm text-muted-foreground">Some nutrient information is unavailable.</p>}
    </div>
  );
}

export function TodayNutrition() {
  const query = useNutritionDay();
  return (
    <section className="mb-4 space-y-3">
      {query.data ? (
        <>
          <CachedRead
            updatedAt={query.dataUpdatedAt}
            failed={query.isError}
            refreshing={query.isFetching}
            refresh={() => query.refetch()}
          />
          <ActionCard
            title="Today’s meals"
            eyebrow="Fuel your day"
            to={routes.nutrition}
            tone="nutrition"
            icon={<Utensils />}
            description={
              query.data.data.summary.has_intake
                ? 'Your meals are saved. Ready for the next one?'
                : query.data.data.plan_id
                  ? 'Your plan is ready. Let’s dig in.'
                  : 'Make a little space to record what you eat.'
            }
          />
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
  const date = params.get('date') || undefined;
  const query = useNutritionDay(date);
  const day = query.data?.data;
  const [dateOpen, setDateOpen] = useState(false);
  return (
    <Page
      title="Nutrition"
      description="A little fuel for your day."
      compact
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        {day?.plan_id && (
          <Link
            className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-surface px-4 font-semibold"
            to={`${generatePath(routes.nutritionPlan, {id: day.plan_id})}?${new URLSearchParams({returnTo: `${routes.nutrition}${params.size ? `?${params}` : ''}`})}`}
          >
            <Utensils
              className="size-4 text-primary"
              aria-hidden="true"
            />
            View plan
          </Link>
        )}
        {date && (
          <Link
            className="inline-flex min-h-11 items-center px-3 font-semibold text-primary"
            to={routes.nutrition}
          >
            Back to today
          </Link>
        )}
      </div>
      <div className="mb-5 flex items-center justify-between gap-2 rounded-3xl bg-surface p-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Previous day"
          isDisabled={!day}
          onPress={() => day && setParams({date: addDays(day.date, -1).toString()})}
        >
          <ChevronLeft aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          aria-label="Choose day"
          className="flex-1 px-2"
          onPress={() => setDateOpen(true)}
        >
          <CalendarDays
            className="size-4"
            aria-hidden="true"
          />
          {day ? dayLabel(day.date) : 'Choose day'}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Next day"
          isDisabled={!day}
          onPress={() => day && setParams({date: addDays(day.date, 1).toString()})}
        >
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
      {dateOpen && (
        <BottomSheet
          title="Choose a day"
          onClose={() => setDateOpen(false)}
        >
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              const selected = new FormData(event.currentTarget).get('date');
              if (typeof selected === 'string' && selected) {
                setParams({date: selected});
              }
              setDateOpen(false);
            }}
          >
            <label className="grid gap-2 font-medium">
              Day
              <input
                aria-label="Nutrition day"
                name="date"
                type="date"
                required
                className="h-12 w-full min-w-0 rounded-xl border border-border px-3 text-base"
                defaultValue={date ?? day?.date ?? ''}
              />
            </label>
            <Button
              type="submit"
              className="w-full"
            >
              Show day
            </Button>
          </form>
        </BottomSheet>
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
          {params.get('saved') && (
            <p
              role="status"
              className="mb-5 flex items-center gap-2 font-semibold text-primary"
            >
              <Check
                className="size-5"
                aria-hidden="true"
              />
              Meal saved.
            </p>
          )}
          <DayOverview day={day} />
        </>
      )}
    </Page>
  );
}

function DayOverview({day}: {day: Day}) {
  const [adding, setAdding] = useState(false);
  const remaining = mealSlots.filter((slot) => !day.slots.some((item) => item.meal_slot === slot));
  return (
    <>
      <section className="space-y-4 mb-6 rounded-[2rem] bg-[var(--nutrition)] p-5">
        {day.summary.has_intake ? (
          <Nutrients
            value={day.summary.logged}
            label="Recorded"
            prominent
          />
        ) : (
          <div className="space-y-2">
            <Utensils
              className="size-7 text-primary -rotate-12"
              aria-hidden="true"
            />
            <h2 className="text-2xl font-bold">Ready when you are</h2>
            <p className="text-sm text-muted-foreground">Open a meal below to record what you ate.</p>
          </div>
        )}
        <details className="space-y-3">
          <summary className="min-h-11 cursor-pointer py-3 font-semibold">Your daily guidance</summary>
          {day.slots.some((slot) => slot.options.length > 0) && (
            <Nutrients
              value={day.summary.planned}
              label="Planned"
            />
          )}
          {Object.values(day.targets).some((value) => value !== null) && (
            <p className="text-sm text-muted-foreground">
              Daily target: {day.targets.calories ?? '—'} kcal · Protein {day.targets.protein_g ?? '—'} g · Carbs{' '}
              {day.targets.carbs_g ?? '—'} g · Fat {day.targets.fat_g ?? '—'} g
            </p>
          )}
          <p className="text-sm text-muted-foreground">{day.applied_timezone.replaceAll('_', ' ')}</p>
        </details>
      </section>
      {!day.write_eligible && <p className="mb-5 text-sm text-muted-foreground">This day is read-only.</p>}
      {day.slots.length === 0 && (
        <p className="mb-6 text-muted-foreground">No meals are planned or recorded for this day.</p>
      )}
      <ul className="divide-y divide-border">
        {day.slots.map((slot) => (
          <li key={slot.meal_slot}>
            <Link
              className="flex items-center gap-3 py-5"
              to={generatePath(routes.nutritionMeal, {date: day.date, slot: slot.meal_slot})}
            >
              <span
                className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--nutrition)] text-primary"
                aria-hidden="true"
              >
                {slot.revision > 0 ? <Check className="size-5" /> : <Utensils className="size-5" />}
              </span>
              <span className="min-w-0 flex-1 space-y-1">
                <span className="block text-xl font-bold">{slotLabel(slot.meal_slot)}</span>
                <span className="block">
                  {slot.options.find((option) => option.meal_id === slot.meal_id)?.meal_name ?? 'Your meal'}
                </span>
                <span className="block text-sm text-muted-foreground">
                  {slot.revision > 0 ? 'Saved' : 'Not recorded'}
                  {slot.logged_calories !== null ? ` · ${slot.logged_calories} kcal recorded` : ''}
                </span>
              </span>
              <ChevronRight
                className="size-5 shrink-0"
                aria-hidden="true"
              />
            </Link>
          </li>
        ))}
      </ul>
      {day.write_eligible && remaining.length > 0 && (
        <div className="mt-6 space-y-3">
          <Button
            variant="outline"
            className="w-full"
            onPress={() => setAdding(!adding)}
          >
            <Plus
              className="size-5"
              aria-hidden="true"
            />
            Record another meal
          </Button>
          {adding && (
            <BottomSheet
              title="Choose a meal time"
              onClose={() => setAdding(false)}
            >
              <ul
                aria-label="Meal times"
                className="divide-y divide-border"
              >
                {remaining.map((slot) => (
                  <li key={slot}>
                    <Link
                      className="flex min-h-14 items-center justify-between py-3 font-semibold"
                      to={generatePath(routes.nutritionMeal, {date: day.date, slot})}
                    >
                      {slotLabel(slot)}
                      <ChevronRight
                        className="size-5"
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </BottomSheet>
          )}
        </div>
      )}
    </>
  );
}

export function CurrentNutritionPlan() {
  const query = useNutritionDay();
  const planId = query.data?.data.plan_id;
  if (planId) {
    return (
      <Navigate
        to={generatePath(routes.nutritionPlan, {id: planId})}
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
        <>
          <CachedRead
            updatedAt={query.dataUpdatedAt}
            failed={query.isError}
            refreshing={query.isFetching}
            refresh={() => query.refetch()}
          />
          <p className="text-muted-foreground">
            Your coach hasn’t scheduled a nutrition plan for today. You can still record your meals.
          </p>
        </>
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
            {plan.start_date
              ? `From ${dayLabel(plan.start_date)}${plan.end_date ? ` to ${dayLabel(plan.end_date)}` : ''}`
              : 'Your coach has not set dates yet.'}
          </p>
          <section className="mb-6 rounded-[2rem] bg-[var(--nutrition)] p-5 space-y-2">
            <h2 className="text-xl font-semibold">Daily targets</h2>
            <p>
              {plan.target_calories ?? '—'} kcal · Protein {plan.target_protein_g ?? '—'} g
            </p>
            <p className="text-muted-foreground">
              Carbs {plan.target_carbs_g ?? '—'} g · Fat {plan.target_fat_g ?? '—'} g · Fiber{' '}
              {plan.target_fiber_g ?? '—'} g
            </p>
          </section>
          <h2 className="text-xl font-semibold mb-3">Weekly guidance</h2>
          <dl className="mb-6 divide-y divide-border rounded-3xl bg-surface px-5">
            {weekdays.map((weekday) => (
              <div
                key={weekday}
                className="flex justify-between gap-4 py-3"
              >
                <dt className="capitalize">{weekday}</dt>
                <dd className="text-right text-muted-foreground">
                  {plan.menu.day_patterns.find((pattern) => pattern.id === plan.menu.schedule[weekday])?.name ??
                    'No guidance'}
                </dd>
              </div>
            ))}
          </dl>
          {plan.menu.day_patterns.map((pattern) => (
            <section
              className="mb-6 space-y-3"
              key={pattern.id}
            >
              <h2 className="text-xl font-semibold">{pattern.name}</h2>
              {pattern.slots.map((slot) => (
                <div
                  className="rounded-2xl bg-surface p-4"
                  key={slot.meal_slot}
                >
                  <h3 className="font-medium">{slotLabel(slot.meal_slot)}</h3>
                  <p className="text-muted-foreground">
                    {slot.meal_ids
                      .map((mealId) => plan.menu.meals.find((meal) => meal.id === mealId)?.name ?? 'Unavailable meal')
                      .join(' or ')}
                  </p>
                </div>
              ))}
            </section>
          ))}
          <h2 className="text-xl font-semibold">Meals</h2>
          {plan.menu.meals.length === 0 && <p className="py-4 text-muted-foreground">No meals have been added yet.</p>}
          {plan.menu.meals.map((meal) => (
            <details
              key={meal.id}
              className="rounded-3xl bg-surface px-5 py-3 mt-3"
            >
              <summary className="min-h-12 py-3 cursor-pointer font-bold text-lg">{meal.name}</summary>
              <div className="py-3 space-y-3">
                {meal.notes && <p className="whitespace-pre-wrap">{meal.notes}</p>}
                <ul className="space-y-3">
                  {meal.meal_items.map((item) => (
                    <li key={item.id}>
                      <p>{item.name ?? 'Unavailable item'}</p>
                      <p className="text-sm text-muted-foreground">{portionText(item.portion)}</p>
                    </li>
                  ))}
                </ul>
                {meal.nutrients && (
                  <Nutrients
                    label="Planned meal"
                    value={meal.nutrients}
                  />
                )}
              </div>
            </details>
          ))}
        </>
      )}
    </Page>
  );
}

import {useState} from 'react';
import {generatePath, Link, useParams, useSearchParams} from 'react-router-dom';
import {type Day, type FoodNutrients, useNutritionDay, useNutritionPlan, useNutritionPlans} from '../api/nutrition';
import {routes} from '../routes';
import {dayLabel} from '../training/recording';
import {Button} from '../ui/button';
import {CachedRead} from '../ui/cached-read';
import {InfiniteList} from '../ui/infinite-list';
import {Page} from '../ui/page';
import {ReadState} from '../ui/read-state';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';
import {mealSlots, portionText, slotLabel} from './meal-draft';

export function Nutrients({value, label}: {value: FoodNutrients; label: string}) {
  return (
    <div className="space-y-1">
      <p className="font-medium">
        {label}: {value.calories === null ? 'Calories unavailable' : `${value.calories} kcal`}
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
    <section className="mb-8 space-y-3">
      <h2 className="text-xl font-semibold">Your nutrition</h2>
      {query.data ? (
        <>
          <CachedRead
            updatedAt={query.dataUpdatedAt}
            failed={query.isError}
            refreshing={query.isFetching}
            refresh={() => query.refetch()}
          />
          <p className="text-muted-foreground">
            {query.data.data.summary.has_intake
              ? 'Your recorded meals are saved. Continue with your next meal.'
              : query.data.data.plan_id
                ? 'Your meals for today are ready.'
                : 'No nutrition plan covers today. You can still record your meals.'}
          </p>
          <Link
            to={routes.nutrition}
            className="text-link inline-block"
          >
            Today’s meals
          </Link>
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
  return (
    <Page
      title="Nutrition"
      description={day ? dayLabel(day.date) : 'Your meals, one day at a time.'}
      back={routes.home}
    >
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Link
          className="text-link"
          to={routes.nutritionPlans}
        >
          Your plans
        </Link>
        {date && (
          <Link
            className="text-link"
            to={routes.nutrition}
          >
            Back to today
          </Link>
        )}
      </div>
      <label className="grid gap-2 mb-6 font-medium">
        Day
        <input
          aria-label="Nutrition day"
          type="date"
          className="h-12 w-full min-w-0 rounded-xl border border-border px-3 text-base"
          value={date ?? day?.date ?? ''}
          onChange={(event) => {
            if (event.target.value) {
              setParams({date: event.target.value});
            }
          }}
        />
      </label>
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
              className="mb-5 font-medium"
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

function DayOverview({day}: {day: Day}) {
  const [adding, setAdding] = useState(false);
  return (
    <>
      <section className="space-y-4 mb-7">
        <Nutrients
          value={day.summary.logged}
          label="Recorded"
        />
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
        <p className="text-sm text-muted-foreground">
          {day.applied_timezone.replaceAll('_', ' ')}
          {!day.write_eligible ? ' · This day is read-only.' : ''}
        </p>
      </section>
      {day.slots.length === 0 && (
        <p className="mb-6 text-muted-foreground">No meals are planned or recorded for this day.</p>
      )}
      <ul className="divide-y divide-border">
        {day.slots.map((slot) => (
          <li key={slot.meal_slot}>
            <Link
              className="block py-5 space-y-1"
              to={generatePath(routes.nutritionMeal, {date: day.date, slot: slot.meal_slot})}
            >
              <span className="block text-xl font-semibold">{slotLabel(slot.meal_slot)}</span>
              <span className="block">
                {slot.options.find((option) => option.meal_id === slot.meal_id)?.meal_name ?? 'Your meal'}
              </span>
              <span className="block text-sm text-muted-foreground">
                {slot.revision > 0 ? 'Saved' : 'Not recorded'}
                {slot.logged_calories !== null ? ` · ${slot.logged_calories} kcal recorded` : ''}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {day.write_eligible && (
        <div className="mt-6 space-y-3">
          <Button
            variant="outline"
            onPress={() => setAdding(!adding)}
          >
            Record another meal
          </Button>
          {adding && (
            <ul
              aria-label="Meal times"
              className="divide-y divide-border"
            >
              {mealSlots
                .filter((slot) => !day.slots.some((item) => item.meal_slot === slot))
                .map((slot) => (
                  <li key={slot}>
                    <Link
                      className="text-link block py-3"
                      to={generatePath(routes.nutritionMeal, {date: day.date, slot})}
                    >
                      {slotLabel(slot)}
                    </Link>
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}

export function NutritionPlans() {
  const [params, setParams] = useSearchParams();
  const search = params.get('search') ?? '';
  const archived = params.get('archived') === 'true';
  const query = useNutritionPlans(search, archived);
  return (
    <Page
      title="Nutrition plans"
      description="Meals and guidance from your coach."
      back={routes.nutrition}
    >
      <form
        className="space-y-3 mb-6"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          setParams({search: String(data.get('search') ?? ''), archived: String(data.get('archived') ?? 'false')});
        }}
      >
        <label className="grid gap-2 font-medium">
          Search plans
          <input
            key={search}
            name="search"
            type="search"
            defaultValue={search}
            className="h-12 rounded-xl border border-border px-3 text-base"
          />
        </label>
        <SelectField
          aria-label="Plan archive"
          name="archived"
          key={String(archived)}
          defaultValue={String(archived)}
        >
          <SelectItem id="false">Your plans</SelectItem>
          <SelectItem id="true">Archived plans</SelectItem>
        </SelectField>
        <Button
          type="submit"
          variant="outline"
        >
          Apply filters
        </Button>
      </form>
      {query.data && (
        <CachedRead
          updatedAt={query.dataUpdatedAt}
          failed={query.isError}
          refreshing={query.isFetching}
          refresh={() => query.refetch()}
        />
      )}
      <InfiniteList
        query={query}
        label="plans"
        singular="plan"
        empty={
          <p className="py-5 text-muted-foreground">
            {search ? 'No plans match this search.' : 'No nutrition plans are available here yet.'}
          </p>
        }
      >
        {(plan) => (
          <Link
            className="block py-5 space-y-1"
            to={generatePath(routes.nutritionPlan, {id: plan.id})}
          >
            <span className="block text-xl font-semibold">{plan.name}</span>
            <span className="block capitalize text-sm text-muted-foreground">
              {plan.lifecycle}
              {plan.start_date ? ` · ${dayLabel(plan.start_date)}` : ''}
            </span>
          </Link>
        )}
      </InfiniteList>
    </Page>
  );
}

export function NutritionPlan() {
  const {id = ''} = useParams();
  const query = useNutritionPlan(id);
  const plan = query.data?.data;
  return (
    <Page
      title={plan?.name ?? 'Nutrition plan'}
      description={plan?.description ?? undefined}
      back={routes.nutritionPlans}
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
          <section className="mb-6 space-y-2">
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
          <dl className="mb-6 space-y-2">
            {Object.entries(plan.menu.schedule).map(([weekday, patternId]) => (
              <div
                key={weekday}
                className="flex justify-between gap-4"
              >
                <dt className="capitalize">{weekday}</dt>
                <dd className="text-right text-muted-foreground">
                  {plan.menu.day_patterns.find((pattern) => pattern.id === patternId)?.name ?? 'No guidance'}
                </dd>
              </div>
            ))}
          </dl>
          {plan.menu.day_patterns.map((pattern) => (
            <section
              className="mb-7 space-y-3"
              key={pattern.id}
            >
              <h2 className="text-xl font-semibold">{pattern.name}</h2>
              {pattern.slots.map((slot) => (
                <div key={slot.meal_slot}>
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
              className="border-b border-border py-3"
            >
              <summary className="py-2 cursor-pointer font-semibold text-lg">{meal.name}</summary>
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

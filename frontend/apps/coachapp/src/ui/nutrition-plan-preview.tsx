import {useState} from 'react';
import type {FoodNutrients, NutritionMenu, NutritionPlan} from '../api/nutrition-plans';
import {Button} from './button';

export function NutritionTargets({
  plan,
}: {
  plan: Pick<
    NutritionPlan,
    'target_calories' | 'target_protein_g' | 'target_carbs_g' | 'target_fat_g' | 'target_fiber_g'
  >;
}) {
  const targets = [
    ['Calories', plan.target_calories, 'kcal'],
    ['Protein', plan.target_protein_g, 'g'],
    ['Carbs', plan.target_carbs_g, 'g'],
    ['Fat', plan.target_fat_g, 'g'],
    ['Fiber', plan.target_fiber_g, 'g'],
  ] as const;
  return (
    <dl className="flex flex-wrap gap-x-6 gap-y-3">
      {targets.map(([label, value, unit]) => (
        <div key={label}>
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="mt-1 font-semibold">{value === null ? 'Not set' : `${value} ${unit}`}</dd>
        </div>
      ))}
    </dl>
  );
}
export function MealNutrients({nutrients}: {nutrients: FoodNutrients | undefined}) {
  if (!nutrients) {
    return null;
  }
  return (
    <p className="text-xs text-muted-foreground">
      {nutrients.calories ?? '—'} kcal · P {nutrients.protein ?? '—'} g · C {nutrients.carbohydrates ?? '—'} g · F{' '}
      {nutrients.fat ?? '—'} g{!nutrients.complete && ' · Nutrition incomplete'}
    </p>
  );
}
export function NutritionMenuPreview({menu}: {menu: NutritionMenu}) {
  const [active, setActive] = useState(menu.day_patterns[0]?.id);
  const pattern = menu.day_patterns.find((day) => day.id === active) ?? menu.day_patterns[0];
  const meals = new Map(menu.meals.map((meal) => [meal.id, meal]));
  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const).map((day) => (
          <div key={day}>
            <dt className="capitalize text-xs text-muted-foreground">{day}</dt>
            <dd>{menu.day_patterns.find((value) => value.id === menu.schedule[day])?.name ?? 'Menu unavailable'}</dd>
          </div>
        ))}
      </dl>
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Preview day menus"
      >
        {menu.day_patterns.map((day) => (
          <Button
            key={day.id}
            variant={day.id === pattern?.id ? 'secondary' : 'ghost'}
            aria-pressed={day.id === pattern?.id}
            onPress={() => setActive(day.id)}
          >
            {day.name}
          </Button>
        ))}
      </div>
      {pattern?.slots.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Follow the daily targets and plan guidance. No meals are prescribed.
        </p>
      )}
      {pattern?.slots.map((slot) => (
        <section
          key={slot.meal_slot}
          className="space-y-4"
        >
          <h3 className="text-lg font-semibold capitalize">{slot.meal_slot.replaceAll('_', ' ')}</h3>
          {slot.meal_ids.map((id, index) => {
            const meal = meals.get(id);
            if (!meal) {
              return null;
            }
            return (
              <div
                key={id}
                className="space-y-2"
              >
                {index > 0 && <p className="text-xs text-muted-foreground">Or choose</p>}
                <h4 className="font-medium">{meal.name}</h4>
                <MealNutrients nutrients={meal.nutrients} />
                <ul className="space-y-2 text-sm">
                  {meal.meal_items.map((item) => (
                    <li
                      key={item.id}
                      className="flex justify-between gap-4"
                    >
                      <span className="min-w-0 break-words">{item.name || 'Meal item'}</span>
                      <span className="shrink-0 text-muted-foreground">
                        {item.portion.kind === 'gram'
                          ? `${item.portion.grams} g`
                          : `${item.portion.amount} ${item.portion.label || item.portion.unit}`}
                      </span>
                    </li>
                  ))}
                </ul>
                {meal.notes && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{meal.notes}</p>}
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
export function NutritionPlanPreview({plan}: {plan: NutritionPlan}) {
  return (
    <div className="space-y-6">
      {plan.description && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{plan.description}</p>}
      <NutritionTargets plan={plan} />
      <NutritionMenuPreview menu={plan.menu} />
    </div>
  );
}

import type {
  FoodNutrients,
  NutritionDay,
  NutritionDayRow,
  NutritionDaySlot,
  NutritionPortion,
} from '../api/nutrition-days';
import {StatusBadge, Surface} from '../ui/page';

const statusLabels = {
  as_planned: 'Logged',
  swapped: 'Swapped',
  added: 'Extra',
  recorded: 'Logged',
  pending: 'Not logged yet',
  skipped: 'Not recorded',
} satisfies Record<NutritionDayRow['status'], string>;

function portionText(portion: NutritionPortion) {
  return portion.kind === 'gram' ? `${portion.grams} g` : `${portion.amount} ${portion.label || portion.unit}`;
}

export function DayTotals({day}: {day: NutritionDay}) {
  const {logged, has_intake: hasIntake} = day.summary;
  const nutrients = [
    ['Calories', logged.calories, day.targets.calories, 'kcal'],
    ['Protein', logged.protein, day.targets.protein_g, 'g'],
    ['Carbs', logged.carbohydrates, day.targets.carbs_g, 'g'],
    ['Fat', logged.fat, day.targets.fat_g, 'g'],
    ['Fiber', logged.fiber, day.targets.fiber_g, 'g'],
  ] as const;
  return (
    <Surface className="space-y-4">
      <h2 className="section-title">Day totals</h2>
      <table
        className="w-full text-left text-sm"
        aria-label="Logged nutrition and daily targets"
      >
        <thead>
          <tr className="text-xs text-muted-foreground">
            <th
              scope="col"
              className="pb-3 font-medium"
            >
              Nutrient
            </th>
            <th
              scope="col"
              className="pb-3 font-medium"
            >
              Logged
            </th>
            <th
              scope="col"
              className="pb-3 font-medium"
            >
              Target
            </th>
          </tr>
        </thead>
        <tbody>
          {nutrients.map(([label, value, target, unit]) => (
            <tr
              key={label}
              className="first:font-semibold"
            >
              <th
                scope="row"
                className="py-2 pr-3 font-medium"
              >
                {label}
              </th>
              <td className="py-2 pr-3">{hasIntake ? (value === null ? 'Unknown' : `${value} ${unit}`) : '—'}</td>
              <td className="py-2 text-muted-foreground">{target === null ? 'Not set' : `${target} ${unit}`}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!hasIntake && <p className="text-sm text-muted-foreground">No food recorded for this date.</p>}
      {hasIntake && !logged.complete && (
        <p className="text-sm text-muted-foreground">
          Some foods have incomplete nutrition. Totals include known values only.
        </p>
      )}
    </Surface>
  );
}

function Nutrients({value}: {value: FoodNutrients}) {
  return (
    <dl className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
      {(
        [
          ['Calories', value.calories, 'kcal'],
          ['Protein', value.protein, 'g'],
          ['Carbs', value.carbohydrates, 'g'],
          ['Fat', value.fat, 'g'],
          ['Fiber', value.fiber, 'g'],
        ] as const
      ).map(([label, amount, unit]) => (
        <div key={label}>
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="mt-1">{amount === null ? 'Unknown' : `${amount} ${unit}`}</dd>
        </div>
      ))}
    </dl>
  );
}

export function MealRecord({slot}: {slot: NutritionDaySlot}) {
  const name = slot.meal_slot.replaceAll('_', ' ');
  return (
    <section
      aria-label={name}
      className="space-y-4"
    >
      <h2 className="section-title capitalize">{name}</h2>
      {slot.rows.length === 0 && <p className="text-sm text-muted-foreground">No food recorded for this meal.</p>}
      <ul className="divide-y divide-border">
        {slot.rows.map((row) => (
          <li
            key={row.id}
            className="py-5 first:pt-0"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 space-y-2">
                <h3 className="break-words text-lg font-semibold">{row.name}</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge>{statusLabels[row.status]}</StatusBadge>
                  {row.kind === 'recipe' && <span className="text-xs text-muted-foreground">Recipe</span>}
                </div>
              </div>
              <p className="max-w-1/2 break-words pt-1 text-right text-sm">
                {row.entry_id === null && <span className="block text-xs text-muted-foreground">Planned</span>}
                {portionText(row.portion)}
              </p>
            </div>
            {row.notes && <p className="mt-3 whitespace-pre-wrap break-words text-sm">{row.notes}</p>}
            <details className="mt-3">
              <summary className="cursor-pointer py-3 text-sm text-muted-foreground">
                {row.entry_id === null ? 'Planned nutrition' : 'Recorded nutrition'}
              </summary>
              <Nutrients value={row.nutrients} />
              {!row.nutrients.complete && (
                <p className="mt-2 text-xs text-muted-foreground">Nutrition is incomplete.</p>
              )}
            </details>
          </li>
        ))}
      </ul>
      {slot.options.length > 0 && (
        <details className="border-t border-border pt-2">
          <summary className="cursor-pointer py-3 text-sm font-medium">View meal guidance</summary>
          <div className="space-y-5 pt-3">
            <p className="text-sm text-muted-foreground">
              {slot.revision > 0
                ? 'Guidance saved when your client first recorded this meal.'
                : 'Current guidance. This meal has not been recorded.'}
            </p>
            {slot.options.map((option) => (
              <div
                key={option.meal_id ?? option.position}
                className="space-y-3"
              >
                <div className="flex flex-wrap items-baseline gap-2">
                  <h3 className="wrap-anywhere font-semibold">{option.meal_name || 'Meal option'}</h3>
                  {option.meal_id === slot.meal_id && (
                    <span className="text-xs text-muted-foreground">Selected meal</span>
                  )}
                </div>
                <ul className="space-y-3 text-sm">
                  {option.items.map((item) => (
                    <li
                      key={item.planned_item_ref}
                      className="flex items-start justify-between gap-4"
                    >
                      <span className="min-w-0 break-words">{item.name || 'Food'}</span>
                      <span className="max-w-1/2 break-words text-right text-muted-foreground">
                        {portionText(item.portion)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}

import type {DiaryMeal, NutritionDay, NutritionSlot} from '../api/nutrition-days';
import {nutrientFields, portionLabel, targetLabel} from '../api/nutrition-values';
import {MealNutrients} from '../ui/nutrition-plan-preview';
import {StatusBadge, Surface} from '../ui/page';

export function DayTotals({day}: {day: NutritionDay}) {
  return (
    <Surface className="space-y-4">
      <h2 className="section-title">Day totals</h2>
      <p className="text-sm">
        {day.counts.recorded} of {day.counts.expected} planned meals recorded
      </p>
      {day.target_changed && (
        <p
          role="note"
          className="rounded-lg bg-muted p-3 text-sm"
        >
          Target changed during this day. These totals use the target in force at the end of the day.
        </p>
      )}
      <table
        className="w-full text-left text-sm"
        aria-label="Recorded nutrition and daily targets"
      >
        <thead>
          <tr className="text-xs text-muted-foreground">
            <th className="pb-3 font-medium">Nutrient</th>
            <th className="pb-3 font-medium">Recorded</th>
            <th className="pb-3 font-medium">Target</th>
          </tr>
        </thead>
        <tbody>
          {nutrientFields.map(([code, name, unit]) => {
            const total = day.totals[code];
            return (
              <tr key={code}>
                <th
                  scope="row"
                  className="py-2 pr-2 font-medium"
                >
                  {name}
                </th>
                <td className="py-2 pr-2">
                  {total?.value == null ? 'Unknown' : `${Math.round(total.value * 10) / 10} ${unit}`}
                  <span className="block text-xs text-muted-foreground">
                    {total?.known_entries ?? 0} of {total?.total_entries ?? 0} entries known
                  </span>
                </td>
                <td className="py-2 text-muted-foreground">{targetLabel(day.targets[code], unit)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {day.plan_revision_id && (
        <p className="text-xs text-muted-foreground">
          Targets: plan revision {day.plan_revision_number}, in force on {day.date}.
        </p>
      )}
    </Surface>
  );
}
export function MealRecord({slot}: {slot: NutritionSlot}) {
  return (
    <section
      className="space-y-4"
      aria-label={slot.name}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="section-title">{slot.name}</h2>
        <StatusBadge>{slot.status === 'recorded' ? 'Recorded' : 'Not recorded'}</StatusBadge>
      </div>
      {slot.meal ? (
        <RecordedMeal meal={slot.meal} />
      ) : (
        <p className="text-sm text-muted-foreground">No meal was recorded for this slot.</p>
      )}
      {slot.options.length > 0 && (
        <details>
          <summary className="cursor-pointer py-2 text-sm font-medium">View meal guidance</summary>
          <div className="space-y-4 pt-3">
            {slot.options.map((meal) => (
              <div
                key={meal.id}
                className="space-y-2"
              >
                <h3 className="font-medium">{meal.name}</h3>
                <ul className="space-y-2 text-sm">
                  {meal.items.map((item) => (
                    <li
                      key={item.id}
                      className="flex justify-between gap-3"
                    >
                      <span>{item.name}</span>
                      <span className="text-muted-foreground">{portionLabel(item.portion)}</span>
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
export function RecordedMeal({meal}: {meal: DiaryMeal}) {
  return (
    <div className="space-y-3">
      <ul className="divide-y divide-border">
        {meal.entries.map((entry) => (
          <li
            key={entry.id}
            className="space-y-2 py-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="editor-item-title">{entry.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {entry.source == null ? 'Quick add' : entry.planned_item_id ? 'Planned item' : 'Extra food'}
                </p>
              </div>
              <span className="text-sm text-muted-foreground">{entry.portion ? portionLabel(entry.portion) : ''}</span>
            </div>
            {entry.notes && <p className="whitespace-pre-wrap text-sm">{entry.notes}</p>}
            <MealNutrients nutrients={entry.nutrients} />
          </li>
        ))}
      </ul>
      {meal.entries.length === 0 && <p className="text-sm text-muted-foreground">No foods in this meal.</p>}
      {meal.note_to_coach && (
        <div className="space-y-1 rounded-xl bg-muted p-3">
          <p className="text-xs font-medium">Note to coach</p>
          <p className="whitespace-pre-wrap text-sm">{meal.note_to_coach}</p>
        </div>
      )}
    </div>
  );
}

import {useState} from 'react';
import type {NutrientMap, NutritionContent, NutritionPlan, NutritionTargets as Targets} from '../api/nutrition-plans';
import {nutrientFields, portionLabel, targetLabel} from '../api/nutrition-values';
import {Button} from './button';

export function NutritionTargets({targets}: {targets: Targets}) {
  return (
    <dl className="flex flex-wrap gap-x-6 gap-y-3">
      {nutrientFields.map(([code, name, unit]) => (
        <div key={code}>
          <dt className="text-xs text-muted-foreground">{name}</dt>
          <dd className="mt-1 font-semibold">{targetLabel(targets[code], unit)}</dd>
        </div>
      ))}
    </dl>
  );
}
export function MealNutrients({nutrients}: {nutrients: NutrientMap | undefined}) {
  return (
    <p className="text-xs text-muted-foreground">
      {nutrients?.energy_kcal ?? 'Unknown'} kcal · Protein {nutrients?.protein_g ?? 'Unknown'} g · Carbs{' '}
      {nutrients?.carbs_g ?? 'Unknown'} g · Fat {nutrients?.fat_g ?? 'Unknown'} g
    </p>
  );
}
export function NutritionContentPreview({content}: {content: NutritionContent}) {
  const [active, setActive] = useState(content.day_patterns[0]?.id);
  const pattern = content.day_patterns.find((value) => value.id === active) ?? content.day_patterns[0];
  return (
    <div className="min-w-0 space-y-5 [overflow-wrap:anywhere]">
      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, index) => (
          <div key={day}>
            <dt className="text-xs text-muted-foreground">{day}</dt>
            <dd>
              {content.day_patterns.find(
                (value) => value.id === content.schedule.entries.find((entry) => entry.day === index)?.ref,
              )?.name ?? 'Not set'}
            </dd>
          </div>
        ))}
      </dl>
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Preview day patterns"
      >
        {content.day_patterns.map((value) => (
          <Button
            key={value.id}
            variant={value.id === pattern?.id ? 'secondary' : 'ghost'}
            onPress={() => setActive(value.id)}
          >
            {value.name}
          </Button>
        ))}
      </div>
      <NutritionTargets targets={pattern?.targets ?? content.targets} />
      {pattern?.slots.length === 0 && (
        <p className="text-sm text-muted-foreground">No meals prescribed. Follow the targets and plan guidance.</p>
      )}
      {pattern?.slots.map((slot) => (
        <section
          key={slot.id}
          className="space-y-3"
        >
          <h3 className="editor-item-title">{slot.name}</h3>
          {slot.meal_ids.map((id, index) => {
            const meal = content.meals.find((value) => value.id === id);
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
                <ul className="space-y-2 text-sm">
                  {meal.items.map((item) => (
                    <li
                      key={item.id}
                      className="space-y-1"
                    >
                      <div className="flex justify-between gap-4">
                        <span>{item.name || 'Food'}</span>
                        <span className="shrink-0 text-muted-foreground">{portionLabel(item.portion)}</span>
                      </div>
                      {item.nutrients && <MealNutrients nutrients={item.nutrients} />}
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
      <NutritionContentPreview content={plan.content} />
    </div>
  );
}

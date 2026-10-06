import {useState} from 'react';
import type {NutritionContent, NutritionMeal, NutritionMealItem} from '../api/nutrition-plans';
import {portionLabel} from '../api/nutrition-values';
import {Button} from '../ui/button';
import {Checkbox} from '../ui/checkbox';
import {Input} from '../ui/input';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';
import {Textarea} from '../ui/textarea';
import {FoodPicker} from './food-picker';
import {newMeal, removeMeal, removePattern, slotSuggestions, weekdays} from './menu';
import {PortionEditor} from './portion-editor';
import {TargetsEditor} from './targets-editor';

export function MenuEditor({
  content,
  onChange,
  pending,
}: {
  content: NutritionContent;
  onChange: (value: NutritionContent) => void;
  pending: boolean;
}) {
  const [activePattern, setActivePattern] = useState(content.day_patterns[0]?.id);
  const [activeMeal, setActiveMeal] = useState<string | undefined>(content.meals[0]?.id);
  const [picking, setPicking] = useState(false);
  const [portion, setPortion] = useState<NutritionMealItem>();
  const pattern = content.day_patterns.find((value) => value.id === activePattern) ?? content.day_patterns[0];
  const meal = content.meals.find((value) => value.id === activeMeal);
  function updateMeal(next: NutritionMeal) {
    onChange({...content, meals: content.meals.map((value) => (value.id === next.id ? next : value))});
  }
  function updatePattern(next: NutritionContent['day_patterns'][number]) {
    onChange({...content, day_patterns: content.day_patterns.map((value) => (value.id === next.id ? next : value))});
  }
  return (
    <div className="min-w-0 space-y-8">
      <section className="editor-section space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="editor-section-title">Meals</h2>
          <Button
            variant="outline"
            onPress={() => {
              const next = newMeal(`Meal ${content.meals.length + 1}`);
              onChange({...content, meals: [...content.meals, next]});
              setActiveMeal(next.id);
            }}
          >
            Add meal
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">Build meals once, then offer them in any day pattern.</p>
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Choose meal"
        >
          {content.meals.map((value) => (
            <Button
              key={value.id}
              variant={value.id === meal?.id ? 'secondary' : 'ghost'}
              aria-pressed={value.id === meal?.id}
              onPress={() => setActiveMeal(value.id)}
            >
              {value.name || 'Unnamed meal'}
            </Button>
          ))}
        </div>
        {!meal && <p className="text-sm text-muted-foreground">Add a meal to choose its foods and portions.</p>}
        {meal && (
          <div className="space-y-4">
            <label
              htmlFor={`meal-${meal.id}`}
              className="grid gap-2 text-sm font-medium"
            >
              Meal name
              <Input
                id={`meal-${meal.id}`}
                className="editor-item-name"
                value={meal.name}
                onChange={(event) => updateMeal({...meal, name: event.target.value})}
              />
            </label>
            <ul className="divide-y divide-border">
              {meal.items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-medium">{item.name || 'Food'}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.source.type === 'recipe' ? 'Recipe · ' : ''}
                      {portionLabel(item.portion)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    aria-label={`Change portion of ${item.name}`}
                    onPress={() => setPortion(item)}
                  >
                    Portion
                  </Button>
                  <Button
                    variant="ghost"
                    aria-label={`Remove ${item.name}`}
                    onPress={() => updateMeal({...meal, items: meal.items.filter((value) => value.id !== item.id)})}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
            <Button
              variant="outline"
              onPress={() => setPicking(true)}
            >
              Add foods or recipes
            </Button>
            <details>
              <summary className="cursor-pointer py-2 text-sm text-muted-foreground">Meal notes</summary>
              <Textarea
                aria-label="Meal notes"
                value={meal.notes ?? ''}
                onChange={(event) => updateMeal({...meal, notes: event.target.value})}
              />
            </details>
            <Button
              variant="ghost"
              onPress={() => {
                onChange(removeMeal(content, meal.id));
                setActiveMeal(undefined);
              }}
            >
              Remove meal
            </Button>
          </div>
        )}
      </section>
      <section className="editor-section space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="editor-section-title">Day patterns</h2>
          <Button
            variant="outline"
            onPress={() => {
              const next = {id: crypto.randomUUID(), name: `Pattern ${content.day_patterns.length + 1}`, slots: []};
              onChange({...content, day_patterns: [...content.day_patterns, next]});
              setActivePattern(next.id);
            }}
          >
            Add day pattern
          </Button>
        </div>
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Choose day pattern"
        >
          {content.day_patterns.map((value) => (
            <Button
              key={value.id}
              variant={value.id === pattern?.id ? 'secondary' : 'ghost'}
              aria-pressed={value.id === pattern?.id}
              onPress={() => setActivePattern(value.id)}
            >
              {value.name || 'Unnamed pattern'}
            </Button>
          ))}
        </div>
        {pattern && (
          <div className="space-y-5">
            <label
              htmlFor={`pattern-${pattern.id}`}
              className="grid gap-2 text-sm font-medium"
            >
              Day pattern name
              <Input
                id={`pattern-${pattern.id}`}
                className="editor-item-name"
                value={pattern.name}
                onChange={(event) => updatePattern({...pattern, name: event.target.value})}
              />
            </label>
            <Checkbox
              isSelected={pattern.targets != null}
              onChange={(selected) => {
                if (selected) {
                  updatePattern({...pattern, targets: {...content.targets}});
                } else {
                  const {targets: _targets, ...next} = pattern;
                  updatePattern(next);
                }
              }}
            >
              Use different targets for this pattern
            </Checkbox>
            {pattern.targets != null && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  These targets replace all plan targets on this pattern's days.
                </p>
                <TargetsEditor
                  label={pattern.name}
                  value={pattern.targets}
                  onChange={(targets) => updatePattern({...pattern, targets})}
                />
              </div>
            )}
            <datalist id="nutrition-slot-suggestions">
              {slotSuggestions.map((name) => (
                <option
                  key={name}
                  value={name}
                />
              ))}
            </datalist>
            {pattern.slots.map((slot) => (
              <section
                key={slot.id}
                className="space-y-3 border-t border-border pt-4"
              >
                <div className="flex items-end gap-2">
                  <label
                    htmlFor={`slot-${slot.id}`}
                    className="grid min-w-0 flex-1 gap-2 text-sm font-medium"
                  >
                    Slot name
                    <Input
                      id={`slot-${slot.id}`}
                      list="nutrition-slot-suggestions"
                      value={slot.name}
                      onChange={(event) =>
                        updatePattern({
                          ...pattern,
                          slots: pattern.slots.map((value) =>
                            value.id === slot.id ? {...value, name: event.target.value} : value,
                          ),
                        })
                      }
                    />
                  </label>
                  <Button
                    variant="ghost"
                    onPress={() =>
                      updatePattern({...pattern, slots: pattern.slots.filter((value) => value.id !== slot.id)})
                    }
                  >
                    Remove slot
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Choose the meals offered in this slot. Names can be custom.
                </p>
                {content.meals.length === 0 && (
                  <p className="text-sm text-muted-foreground">Create a meal above to offer it here.</p>
                )}
                <div className="grid gap-x-4 sm:grid-cols-2">
                  {content.meals.map((option) => (
                    <Checkbox
                      key={option.id}
                      isSelected={slot.meal_ids.includes(option.id)}
                      onChange={(selected) =>
                        updatePattern({
                          ...pattern,
                          slots: pattern.slots.map((value) =>
                            value.id === slot.id
                              ? {
                                  ...value,
                                  meal_ids: selected
                                    ? [...value.meal_ids, option.id]
                                    : value.meal_ids.filter((id) => id !== option.id),
                                }
                              : value,
                          ),
                        })
                      }
                    >
                      {option.name}
                    </Checkbox>
                  ))}
                </div>
              </section>
            ))}
            <Button
              variant="outline"
              onPress={() =>
                updatePattern({
                  ...pattern,
                  slots: [...pattern.slots, {id: crypto.randomUUID(), name: '', meal_ids: []}],
                })
              }
            >
              Add slot
            </Button>
            {content.day_patterns.length > 1 && (
              <details>
                <summary className="cursor-pointer py-2 text-sm text-muted-foreground">Remove this pattern</summary>
                <p className="py-2 text-sm">Choose the pattern to use for its scheduled days.</p>
                {content.day_patterns
                  .filter((value) => value.id !== pattern.id)
                  .map((replacement) => (
                    <Button
                      key={replacement.id}
                      variant="ghost"
                      onPress={() => {
                        onChange(removePattern(content, pattern.id, replacement.id));
                        setActivePattern(replacement.id);
                      }}
                    >
                      Replace with {replacement.name}
                    </Button>
                  ))}
              </details>
            )}
          </div>
        )}
      </section>
      <section className="editor-section space-y-4">
        <h2 className="editor-section-title">Weekly schedule</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {weekdays.map((day, index) => (
            <div
              key={day}
              className="grid gap-2"
            >
              <span className="text-sm font-medium">{day}</span>
              <SelectField
                aria-label={`${day} pattern`}
                isDisabled={pending}
                value={content.schedule.entries.find((entry) => entry.day === index)?.ref ?? ''}
                onChange={(ref) =>
                  onChange({
                    ...content,
                    schedule: {
                      ...content.schedule,
                      entries: content.schedule.entries.map((entry) => (entry.day === index ? {...entry, ref} : entry)),
                    },
                  })
                }
              >
                {content.day_patterns.map((value) => (
                  <SelectItem
                    key={value.id}
                    id={value.id}
                  >
                    {value.name}
                  </SelectItem>
                ))}
              </SelectField>
            </div>
          ))}
        </div>
      </section>
      {picking && meal && (
        <FoodPicker
          onClose={() => setPicking(false)}
          onAdd={(items) => {
            updateMeal({...meal, items: [...meal.items, ...items]});
            setPicking(false);
          }}
        />
      )}
      {portion && meal && (
        <PortionEditor
          item={portion}
          onClose={() => setPortion(undefined)}
          onApply={(value) => {
            updateMeal({
              ...meal,
              items: meal.items.map((item) => (item.id === portion.id ? {...item, portion: value} : item)),
            });
            setPortion(undefined);
          }}
        />
      )}
    </div>
  );
}

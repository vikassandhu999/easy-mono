import {useState} from 'react';
import type {NutritionMeal, NutritionMealItem, NutritionMenu} from '../api/nutrition-plans';
import {Button} from '../ui/button';
import {Input} from '../ui/input';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';
import {Textarea} from '../ui/textarea';
import {FoodPicker} from './food-picker';
import {newMeal, removeMeal, restoreMeal, slotLabel, slots, weekdays} from './menu';

export function MenuEditor({menu, onChange}: {menu: NutritionMenu; onChange: (menu: NutritionMenu) => void}) {
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [active, setActive] = useState(menu.day_patterns[0]?.id);
  const pattern = menu.day_patterns.find((day) => day.id === active) ?? menu.day_patterns[0];
  const [newSlot, setNewSlot] = useState<(typeof slots)[number]>('breakfast');
  const [picking, setPicking] = useState<string | null>(null);
  const [removed, setRemoved] = useState<{
    meal: NutritionMeal;
    patternId: string;
    slot: (typeof slots)[number];
    index: number;
  } | null>(null);
  if (!pattern) {
    return null;
  }
  function updateMeal(meal: NutritionMeal) {
    onChange({...menu, meals: menu.meals.map((value) => (value.id === meal.id ? meal : value))});
  }
  function addMeal(slot: (typeof slots)[number]) {
    if (!pattern) {
      return;
    }
    const meal = newMeal(slotLabel(slot));
    const exists = pattern.slots.some((value) => value.meal_slot === slot);
    onChange({
      ...menu,
      meals: [...menu.meals, meal],
      day_patterns: menu.day_patterns.map((day) =>
        day.id !== pattern.id
          ? day
          : {
              ...day,
              slots: exists
                ? day.slots.map((value) =>
                    value.meal_slot !== slot ? value : {...value, meal_ids: [...value.meal_ids, meal.id]},
                  )
                : [...day.slots, {meal_slot: slot, meal_ids: [meal.id]}],
            },
      ),
    });
  }
  function duplicateDay() {
    if (!pattern) {
      return;
    }
    const meals = new Map(menu.meals.map((meal) => [meal.id, meal]));
    const copies = new Map<string, NutritionMeal>();
    for (const slot of pattern.slots) {
      for (const id of slot.meal_ids) {
        const source = meals.get(id);
        if (source && !copies.has(id)) {
          copies.set(id, {
            ...source,
            id: crypto.randomUUID(),
            meal_items: source.meal_items.map((item) => ({...item, id: crypto.randomUUID()})),
          });
        }
      }
    }
    const day = {
      ...pattern,
      id: crypto.randomUUID(),
      name: `${pattern.name} variation`,
      slots: pattern.slots.map((slot) => ({...slot, meal_ids: slot.meal_ids.map((id) => copies.get(id)?.id ?? id)})),
    };
    onChange({...menu, meals: [...menu.meals, ...copies.values()], day_patterns: [...menu.day_patterns, day]});
    setActive(day.id);
    setScheduleOpen(true);
  }
  return (
    <section
      className="min-w-0 space-y-6"
      aria-label="Meal worksheet"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Meals for the week</h2>
        <Button
          variant="outline"
          onPress={duplicateDay}
        >
          Create day variation
        </Button>
      </div>
      <details
        open={scheduleOpen}
        onToggle={(event) => setScheduleOpen(event.currentTarget.open)}
      >
        <summary className="w-fit cursor-pointer py-2 text-sm text-muted-foreground">Assign menus to weekdays</summary>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {weekdays.map((day) => (
            <div
              key={day}
              className="grid gap-1"
            >
              <label
                id={`nutrition-${day}-label`}
                htmlFor={`nutrition-${day}`}
                className="text-xs capitalize text-muted-foreground"
              >
                {day}
              </label>
              <SelectField
                id={`nutrition-${day}`}
                aria-label={`${day} menu`}
                value={menu.schedule[day]}
                onChange={(selected) => onChange({...menu, schedule: {...menu.schedule, [day]: selected}})}
              >
                {menu.day_patterns.map((value) => (
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
      </details>
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Day menus"
      >
        {menu.day_patterns.map((day) => (
          <Button
            key={day.id}
            className="max-w-full"
            aria-pressed={pattern.id === day.id}
            variant={pattern.id === day.id ? 'secondary' : 'ghost'}
            onPress={() => setActive(day.id)}
          >
            <span className="truncate">{day.name}</span>
          </Button>
        ))}
      </div>
      <label
        id="nutrition-day-name-label"
        htmlFor="nutrition-day-name"
        className="grid max-w-md gap-1 text-xs text-muted-foreground"
      >
        Day menu name
        <Input
          id="nutrition-day-name"
          value={pattern.name}
          maxLength={255}
          className="text-xl font-bold"
          onChange={(event) =>
            onChange({
              ...menu,
              day_patterns: menu.day_patterns.map((day) =>
                day.id === pattern.id ? {...day, name: event.target.value} : day,
              ),
            })
          }
        />
      </label>
      {pattern.slots.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Add the meals you want to offer. You can add alternatives for each meal time.
        </p>
      )}
      <div className="space-y-10">
        {pattern.slots.map((slot) => (
          <section
            key={slot.meal_slot}
            aria-label={`${slotLabel(slot.meal_slot)} options`}
            className="space-y-5"
          >
            <h3 className="text-lg font-semibold capitalize">{slotLabel(slot.meal_slot)}</h3>
            {slot.meal_ids.map((id, index) => {
              const meal = menu.meals.find((value) => value.id === id);
              if (!meal) {
                return null;
              }
              return (
                <section
                  key={meal.id}
                  aria-label={`${meal.name} meal`}
                  className="space-y-3"
                >
                  {index > 0 && (
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Or choose</p>
                  )}
                  <div className="flex items-center gap-3">
                    <label
                      id={`${`meal-name-${meal.id}`}-label`}
                      htmlFor={`meal-name-${meal.id}`}
                      className="grid min-w-0 flex-1 gap-1 text-xs text-muted-foreground"
                    >
                      Meal name
                      <Input
                        id={`meal-name-${meal.id}`}
                        value={meal.name}
                        maxLength={255}
                        className="font-semibold"
                        onChange={(event) => updateMeal({...meal, name: event.target.value})}
                      />
                    </label>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Remove ${meal.name} meal`}
                      onPress={() => {
                        setRemoved({meal, patternId: pattern.id, slot: slot.meal_slot, index});
                        onChange(removeMeal(menu, pattern.id, meal.id));
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                  {meal.meal_items.map((item) => (
                    <FoodRow
                      key={item.id}
                      item={item}
                      onChange={(next) =>
                        updateMeal({
                          ...meal,
                          meal_items: meal.meal_items.map((value) => (value.id === next.id ? next : value)),
                        })
                      }
                      onRemove={() =>
                        updateMeal({...meal, meal_items: meal.meal_items.filter((value) => value.id !== item.id)})
                      }
                    />
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={() => setPicking(meal.id)}
                  >
                    Add foods or recipes
                  </Button>
                  <details>
                    <summary className="w-fit cursor-pointer py-2 text-sm text-muted-foreground">Meal guidance</summary>
                    <label
                      id={`${`meal-notes-${meal.id}`}-label`}
                      htmlFor={`meal-notes-${meal.id}`}
                      className="grid gap-1 text-xs text-muted-foreground"
                    >
                      Notes
                      <Textarea
                        id={`meal-notes-${meal.id}`}
                        value={meal.notes ?? ''}
                        onChange={(event) => updateMeal({...meal, notes: event.target.value})}
                      />
                    </label>
                  </details>
                </section>
              );
            })}
            <Button
              variant="ghost"
              size="sm"
              onPress={() => addMeal(slot.meal_slot)}
            >
              Add {slotLabel(slot.meal_slot)} alternative
            </Button>
          </section>
        ))}
      </div>
      {removed && (
        <div
          role="status"
          className="flex items-center justify-between gap-2 text-sm"
        >
          <span>Meal removed.</span>
          <Button
            variant="ghost"
            onPress={() => {
              onChange(restoreMeal(menu, removed));
              setRemoved(null);
            }}
          >
            Undo
          </Button>
        </div>
      )}
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1">
          <label
            id="nutrition-meal-time-label"
            htmlFor="nutrition-meal-time"
            className="text-xs text-muted-foreground"
          >
            Meal time
          </label>
          <SelectField
            id="nutrition-meal-time"
            value={newSlot}
            onChange={(selected) => {
              const value = slots.find((slot) => slot === selected);
              if (value) {
                setNewSlot(value);
              }
            }}
          >
            {slots.map((slot) => (
              <SelectItem
                key={slot}
                id={slot}
              >
                {slotLabel(slot)}
              </SelectItem>
            ))}
          </SelectField>
        </div>
        <Button
          variant="outline"
          onPress={() => addMeal(newSlot)}
        >
          Add meal
        </Button>
      </div>
      {picking && (
        <FoodPicker
          onClose={() => setPicking(null)}
          onAdd={(items) => {
            const meal = menu.meals.find((value) => value.id === picking);
            if (meal) {
              updateMeal({...meal, meal_items: [...meal.meal_items, ...items]});
            }
            setPicking(null);
          }}
        />
      )}
    </section>
  );
}
function FoodRow({
  item,
  onChange,
  onRemove,
}: {
  item: NutritionMealItem;
  onChange: (item: NutritionMealItem) => void;
  onRemove: () => void;
}) {
  const portion = item.portion;
  return (
    <div
      className="grid grid-cols-[minmax(0,1fr)_6rem_2.75rem] items-center gap-2"
      role="group"
      aria-label={item.name || 'Meal item'}
    >
      <p className="min-w-0 break-words text-sm font-medium">{item.name || 'Meal item'}</p>
      <label
        id={`${`portion-${item.id}`}-label`}
        htmlFor={`portion-${item.id}`}
        className="grid gap-1 text-xs text-muted-foreground"
      >
        {portion.kind === 'gram' ? 'Grams' : portion.label || portion.unit}
        <Input
          id={`portion-${item.id}`}
          aria-label={`${item.name} portion`}
          type="number"
          inputMode="decimal"
          min="0.01"
          step="any"
          value={(portion.kind === 'gram' ? portion.grams : portion.amount) || ''}
          onChange={(event) =>
            onChange({
              ...item,
              portion:
                portion.kind === 'gram'
                  ? {...portion, grams: Number(event.target.value)}
                  : {...portion, amount: Number(event.target.value)},
            })
          }
        />
      </label>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Remove ${item.name}`}
        onPress={onRemove}
      >
        ×
      </Button>
    </div>
  );
}

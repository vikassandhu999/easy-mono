import {useEffect, useRef, useState} from 'react';
import type {NutritionMeal, NutritionMealItem, NutritionMenu} from '../api/nutrition-plans';
import {Button} from '../ui/button';
import {Input} from '../ui/input';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';
import {Textarea} from '../ui/textarea';
import {ArrangeMenu} from './arrange-menu';
import {FoodPicker} from './food-picker';
import {
  type MenuIssue,
  newMeal,
  removeDayMenu,
  removeMeal,
  restoreDayMenu,
  restoreMeal,
  slotLabel,
  slots,
  weekdays,
} from './menu';
import {PortionEditor} from './portion-editor';
import {RemoveDayMenu} from './remove-day-menu';

export function MenuEditor({
  menu,
  issue,
  pending,
  onChange,
}: {
  menu: NutritionMenu;
  issue: MenuIssue | null;
  pending: boolean;
  onChange: (menu: NutritionMenu) => void;
}) {
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [active, setActive] = useState(menu.day_patterns[0]?.id);
  const pattern = menu.day_patterns.find((day) => day.id === active) ?? menu.day_patterns[0];
  const [newSlot, setNewSlot] = useState<(typeof slots)[number]>('breakfast');
  const [picking, setPicking] = useState<string | null>(null);
  const [removingDay, setRemovingDay] = useState(false);
  const [arranging, setArranging] = useState(false);
  const [removedDay, setRemovedDay] = useState<NonNullable<ReturnType<typeof removeDayMenu>>['removed'] | null>(null);
  const [removedItem, setRemovedItem] = useState<{mealId: string; item: NutritionMealItem; index: number} | null>(null);
  const [removed, setRemoved] = useState<{
    meal: NutritionMeal;
    patternId: string;
    slot: (typeof slots)[number];
    index: number;
  } | null>(null);
  const focusedIssue = useRef<MenuIssue | null>(null);
  useEffect(() => {
    if (!issue || pending || focusedIssue.current === issue) {
      return;
    }
    const day = menu.day_patterns.find((value) =>
      issue.kind === 'day'
        ? value.id === issue.dayId
        : value.slots.some((slot) => slot.meal_ids.includes(issue.mealId)),
    );
    if (!day) {
      return;
    }
    if (day.id !== pattern?.id) {
      setActive(day.id);
      return;
    }
    let fieldId = 'nutrition-day-name';
    if (issue.kind !== 'day') {
      const slot = day.slots.find((value) => value.meal_ids.includes(issue.mealId));
      if (!slot) {
        return;
      }
      const scope = `${day.id}-${slot.meal_slot}-${issue.mealId}`;
      fieldId = issue.kind === 'meal' ? `meal-name-${scope}` : `portion-${scope}-${issue.itemId}`;
    }
    const field = document.getElementById(fieldId);
    if (field) {
      field.focus();
      field.scrollIntoView({block: 'center'});
      focusedIssue.current = issue;
    }
  }, [issue, menu.day_patterns, pattern?.id, pending]);
  if (!pattern) {
    return null;
  }
  const dayError = issue?.kind === 'day' && issue.dayId === pattern.id ? issue.message : undefined;
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
      className="editor-section min-w-0 space-y-5"
      aria-label="Meal worksheet"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="editor-section-title">Meals for the week</h2>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            onPress={() => setArranging(true)}
          >
            Arrange menus
          </Button>
          <Button
            variant="outline"
            onPress={duplicateDay}
          >
            Create day variation
          </Button>
        </div>
      </div>
      {removedDay && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-2 text-sm"
        >
          <span className="min-w-0 break-words">Removed {removedDay.pattern.name}.</span>
          <Button
            variant="ghost"
            size="sm"
            onPress={() => {
              onChange(restoreDayMenu(menu, removedDay));
              setActive(removedDay.pattern.id);
              setRemovedDay(null);
            }}
          >
            Undo menu removal
          </Button>
        </div>
      )}
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
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 max-w-md flex-1 basis-48">
          <label
            id="nutrition-day-name-label"
            htmlFor="nutrition-day-name"
            className="grid gap-1 text-xs text-muted-foreground"
          >
            Day menu name
            <Input
              id="nutrition-day-name"
              value={pattern.name}
              aria-invalid={Boolean(dayError)}
              aria-describedby={dayError ? 'nutrition-day-name-error' : undefined}
              maxLength={255}
              className="editor-item-name"
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
          {dayError && (
            <p
              id="nutrition-day-name-error"
              className="mt-1 text-sm text-destructive"
            >
              {dayError}
            </p>
          )}
        </div>
        {menu.day_patterns.length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            onPress={() => setRemovingDay(true)}
          >
            Remove day menu
          </Button>
        )}
      </div>
      {removedItem && menu.meals.some((meal) => meal.id === removedItem.mealId) && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-2 text-sm"
        >
          <span className="min-w-0 break-words">Removed {removedItem.item.name || 'meal item'}.</span>
          <Button
            variant="ghost"
            size="sm"
            onPress={() => {
              const meal = menu.meals.find((value) => value.id === removedItem.mealId);
              if (meal && !meal.meal_items.some((item) => item.id === removedItem.item.id)) {
                const meal_items = [...meal.meal_items];
                meal_items.splice(removedItem.index, 0, removedItem.item);
                updateMeal({...meal, meal_items});
              }
              setRemovedItem(null);
            }}
          >
            Undo item removal
          </Button>
        </div>
      )}
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
            <h3 className="editor-item-title capitalize">{slotLabel(slot.meal_slot)}</h3>
            {slot.meal_ids.map((id, index) => {
              const meal = menu.meals.find((value) => value.id === id);
              if (!meal) {
                return null;
              }
              const mealScope = `${pattern.id}-${slot.meal_slot}-${meal.id}`;
              const mealError = issue?.kind === 'meal' && issue.mealId === meal.id ? issue.message : undefined;
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
                      id={`meal-name-${mealScope}-label`}
                      htmlFor={`meal-name-${mealScope}`}
                      className="grid min-w-0 flex-1 gap-1 text-xs text-muted-foreground"
                    >
                      Meal name
                      <Input
                        id={`meal-name-${mealScope}`}
                        value={meal.name}
                        aria-invalid={Boolean(mealError)}
                        aria-describedby={mealError ? `meal-name-${mealScope}-error` : undefined}
                        maxLength={255}
                        className="editor-item-name"
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
                  {mealError && (
                    <p
                      id={`meal-name-${mealScope}-error`}
                      className="text-sm text-destructive"
                    >
                      {mealError}
                    </p>
                  )}
                  {meal.meal_items.map((item, itemIndex) => (
                    <FoodRow
                      key={item.id}
                      item={item}
                      scope={mealScope}
                      onChange={(next) =>
                        updateMeal({
                          ...meal,
                          meal_items: meal.meal_items.map((value) => (value.id === next.id ? next : value)),
                        })
                      }
                      onRemove={() => {
                        setRemovedItem({mealId: meal.id, item, index: itemIndex});
                        updateMeal({...meal, meal_items: meal.meal_items.filter((value) => value.id !== item.id)});
                      }}
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
                      id={`meal-notes-${mealScope}-label`}
                      htmlFor={`meal-notes-${mealScope}`}
                      className="grid gap-1 text-xs text-muted-foreground"
                    >
                      Notes
                      <Textarea
                        id={`meal-notes-${mealScope}`}
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
      {removingDay && (
        <RemoveDayMenu
          menu={menu}
          patternId={pattern.id}
          onClose={() => setRemovingDay(false)}
          onRemove={(replacementId) => {
            const result = removeDayMenu(menu, pattern.id, replacementId);
            if (result) {
              onChange(result.menu);
              setRemovedDay(result.removed);
              setActive(replacementId);
              setRemoved(null);
              setRemovedItem(null);
            }
            setRemovingDay(false);
          }}
        />
      )}
      {arranging && (
        <ArrangeMenu
          menu={menu}
          onClose={() => setArranging(false)}
          onApply={(value) => {
            onChange(value);
            setArranging(false);
          }}
        />
      )}
    </section>
  );
}
function FoodRow({
  item,
  scope,
  onChange,
  onRemove,
}: {
  item: NutritionMealItem;
  scope: string;
  onChange: (item: NutritionMealItem) => void;
  onRemove: () => void;
}) {
  const portion = item.portion;
  const [editing, setEditing] = useState(false);
  const [quantityDraft, setQuantityDraft] = useState<{text: string; value: number} | null>(null);
  const quantity = portion.kind === 'gram' ? portion.grams : portion.amount;
  const invalidQuantity = !Number.isFinite(quantity) || quantity <= 0;
  const portionId = `portion-${scope}-${item.id}`;
  return (
    <div
      className="grid grid-cols-[minmax(0,1fr)_6rem_2.75rem] items-center gap-2"
      role="group"
      aria-label={item.name || 'Meal item'}
    >
      <div className="min-w-0">
        <p className="break-words text-sm font-medium">{item.name || 'Meal item'}</p>
        <Button
          variant="ghost"
          size="sm"
          className="px-0 text-xs font-normal text-muted-foreground"
          aria-label={`Change portion for ${item.name || 'meal item'}`}
          onPress={() => setEditing(true)}
        >
          Change portion
        </Button>
      </div>
      <label
        id={`${portionId}-label`}
        htmlFor={portionId}
        className="grid gap-1 text-xs text-muted-foreground"
      >
        {portion.kind === 'gram' ? 'Grams' : portion.label || portion.unit}
        <Input
          id={portionId}
          aria-label={`${item.name} portion`}
          inputMode="decimal"
          value={quantityDraft && Object.is(quantityDraft.value, quantity) ? quantityDraft.text : String(quantity)}
          aria-invalid={invalidQuantity}
          aria-describedby={invalidQuantity ? `${portionId}-error` : undefined}
          onChange={(event) => {
            const value = Number(event.target.value);
            setQuantityDraft({text: event.target.value, value});
            onChange({
              ...item,
              portion: portion.kind === 'gram' ? {...portion, grams: value} : {...portion, amount: value},
            });
          }}
        />
        {invalidQuantity && (
          <span
            id={`${portionId}-error`}
            className="text-xs text-destructive"
          >
            Enter more than zero.
          </span>
        )}
      </label>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Remove ${item.name}`}
        onPress={onRemove}
      >
        ×
      </Button>
      {editing && (
        <PortionEditor
          item={item}
          onClose={() => setEditing(false)}
          onApply={(next) => {
            setQuantityDraft(null);
            onChange({...item, portion: next});
            setEditing(false);
          }}
        />
      )}
    </div>
  );
}

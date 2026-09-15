import {ArrowDown, ArrowLeft, ArrowUp, ChevronRight} from 'lucide-react';
import {useRef, useState} from 'react';
import type {NutritionMenu} from '../api/nutrition-plans';
import {Button} from '../ui/button';
import {Dialog, DialogHeader, DialogTitle} from '../ui/dialog';
import {slotLabel} from './menu';

type MealSlot = NutritionMenu['day_patterns'][number]['slots'][number]['meal_slot'];
type Location =
  | {kind: 'menus'}
  | {kind: 'times'; dayId: string}
  | {kind: 'choices'; dayId: string; slot: MealSlot}
  | {kind: 'items'; dayId: string; slot: MealSlot; mealId: string};

function move<T>(items: T[], from: number, to: number): T[] {
  if (from < 0 || from >= items.length || to < 0 || to >= items.length) {
    return items;
  }
  const result = [...items];
  const [item] = result.splice(from, 1);
  if (item !== undefined) {
    result.splice(to, 0, item);
  }
  return result;
}

export function ArrangeMenu({
  menu,
  onApply,
  onClose,
}: {
  menu: NutritionMenu;
  onApply: (menu: NutritionMenu) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(menu);
  const [location, setLocation] = useState<Location>({kind: 'menus'});
  const [moved, setMoved] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const rowElements = useRef(new Map<string, HTMLLIElement>());
  const day = location.kind === 'menus' ? undefined : draft.day_patterns.find((value) => value.id === location.dayId);
  const slot =
    location.kind === 'choices' || location.kind === 'items'
      ? day?.slots.find((value) => value.meal_slot === location.slot)
      : undefined;
  const meal = location.kind === 'items' ? draft.meals.find((value) => value.id === location.mealId) : undefined;
  const title =
    location.kind === 'menus'
      ? 'Day menus'
      : location.kind === 'times'
        ? day?.name
        : location.kind === 'choices'
          ? `${day?.name} · ${slotLabel(location.slot)}`
          : meal?.name;
  const rows =
    location.kind === 'menus'
      ? draft.day_patterns.map((value) => ({id: value.id, label: value.name}))
      : location.kind === 'times'
        ? (day?.slots ?? []).map((value) => ({id: value.meal_slot, label: slotLabel(value.meal_slot)}))
        : location.kind === 'choices'
          ? (slot?.meal_ids ?? []).map((id) => ({
              id,
              label: draft.meals.find((value) => value.id === id)?.name || 'Meal',
            }))
          : (meal?.meal_items ?? []).map((item) => ({id: item.id, label: item.name || 'Meal item'}));

  function reorder(from: number, to: number) {
    switch (location.kind) {
      case 'menus':
        setDraft({...draft, day_patterns: move(draft.day_patterns, from, to)});
        break;
      case 'times':
        return;
      case 'choices':
        setDraft({
          ...draft,
          day_patterns: draft.day_patterns.map((value) =>
            value.id === location.dayId
              ? {
                  ...value,
                  slots: value.slots.map((valueSlot) =>
                    valueSlot.meal_slot === location.slot
                      ? {...valueSlot, meal_ids: move(valueSlot.meal_ids, from, to)}
                      : valueSlot,
                  ),
                }
              : value,
          ),
        });
        break;
      case 'items':
        setDraft({
          ...draft,
          meals: draft.meals.map((value) =>
            value.id === location.mealId ? {...value, meal_items: move(value.meal_items, from, to)} : value,
          ),
        });
        break;
    }
    setMoved(`${rows[from]?.label || 'Item'} moved to position ${to + 1}.`);
    const id = rows[from]?.id;
    if (id) {
      requestAnimationFrame(() => rowElements.current.get(id)?.focus());
    }
  }

  function open(id: string) {
    setMoved('');
    if (location.kind === 'menus') {
      setLocation({kind: 'times', dayId: id});
    } else if (location.kind === 'times') {
      const selected = day?.slots.find((value) => value.meal_slot === id);
      if (selected) {
        setLocation({kind: 'choices', dayId: location.dayId, slot: selected.meal_slot});
      }
    } else if (location.kind === 'choices') {
      setLocation({...location, kind: 'items', mealId: id});
    }
    requestAnimationFrame(() => heading.current?.focus());
  }

  function back() {
    setMoved('');
    if (location.kind === 'times') {
      setLocation({kind: 'menus'});
    } else if (location.kind === 'choices') {
      setLocation({kind: 'times', dayId: location.dayId});
    } else if (location.kind === 'items') {
      setLocation({kind: 'choices', dayId: location.dayId, slot: location.slot});
    }
    requestAnimationFrame(() => heading.current?.focus());
  }

  return (
    <Dialog
      isOpen
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onClose();
        }
      }}
    >
      <DialogHeader>
        <DialogTitle>Arrange menus</DialogTitle>
      </DialogHeader>
      <div className="dialog-body space-y-4">
        {location.kind !== 'menus' && (
          <Button
            variant="ghost"
            size="sm"
            onPress={back}
          >
            <ArrowLeft aria-hidden="true" />
            Back
          </Button>
        )}
        <div>
          <h3
            ref={heading}
            tabIndex={-1}
            className="break-words text-lg font-semibold capitalize"
          >
            {title}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {location.kind === 'menus'
              ? 'Move day menus into your preferred order. Open a menu to arrange its meals.'
              : location.kind === 'times'
                ? 'Meal times follow their daily order. Choose one to arrange its alternatives.'
                : location.kind === 'choices'
                  ? 'Put your preferred meal first. Open a meal to arrange its foods and recipes.'
                  : 'Order the foods and recipes. This order follows the meal wherever it appears.'}
          </p>
        </div>
        <ol
          aria-label="Current order"
          className="space-y-2"
        >
          {rows.map((row, index) => (
            <li
              key={row.id}
              ref={(element) => {
                if (element) {
                  rowElements.current.set(row.id, element);
                } else {
                  rowElements.current.delete(row.id);
                }
              }}
              tabIndex={-1}
              aria-label={row.label}
              className="flex items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-ring"
            >
              {location.kind === 'items' ? (
                <p className="min-w-0 flex-1 break-words py-3 text-sm font-medium">{row.label}</p>
              ) : (
                <Button
                  variant="ghost"
                  className="h-auto min-h-12 min-w-0 flex-1 justify-between whitespace-normal px-0 text-left"
                  aria-label={`Arrange ${row.label}`}
                  onPress={() => open(row.id)}
                >
                  <span className="min-w-0 break-words capitalize">{row.label}</span>
                  <ChevronRight
                    aria-hidden="true"
                    className="shrink-0"
                  />
                </Button>
              )}
              {location.kind !== 'times' && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Move ${row.label} up`}
                    isDisabled={index === 0}
                    onPress={() => reorder(index, index - 1)}
                  >
                    <ArrowUp aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Move ${row.label} down`}
                    isDisabled={index === rows.length - 1}
                    onPress={() => reorder(index, index + 1)}
                  >
                    <ArrowDown aria-hidden="true" />
                  </Button>
                </>
              )}
            </li>
          ))}
        </ol>
        {rows.length === 0 && <p className="text-sm text-muted-foreground">Nothing to arrange here yet.</p>}
        <p
          role="status"
          className="text-sm text-muted-foreground"
        >
          {moved}
        </p>
      </div>
      <div className="flex justify-end gap-2 border-t border-border p-4">
        <Button
          variant="ghost"
          onPress={onClose}
        >
          Cancel
        </Button>
        <Button
          isDisabled={draft === menu}
          onPress={() => onApply(draft)}
        >
          Apply order
        </Button>
      </div>
    </Dialog>
  );
}

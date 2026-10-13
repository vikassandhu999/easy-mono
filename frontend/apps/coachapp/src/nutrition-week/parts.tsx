import {Plus} from 'lucide-react';
import {useEffect, useId, useState} from 'react';
import {type Food, useFoods} from '../api/foods';
import {useNutritionPresets} from '../api/nutrition-week';
import {Button} from '../ui/button';
import {cn} from '../ui/cn';
import {InfiniteList} from '../ui/infinite-list';
import {Input} from '../ui/input';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';
import {errorClass, fieldClass, SearchField} from '../ui/week-editor';
import {
  daysLabel,
  type Item,
  isAmount,
  itemNutrients,
  type Kind,
  nutrientLine,
  type Preset,
  perLabel,
  presetSummary,
  presetTitle,
  type State,
  unitsOf,
  usesOf,
} from './model';

export {
  type Commit,
  DraftGuard,
  EditDialog,
  errorClass,
  fieldClass,
  SaveRecovery,
  SearchField,
  type Undo,
  UndoToast,
  useDraftGuard,
  WeekdayPicker,
} from '../ui/week-editor';

export const pickRow = 'h-auto w-full flex-col items-start gap-0.5 whitespace-normal py-2 text-left';
export function FoodList({kinds, onPick}: {kinds: Kind[]; onPick: (food: Food) => void}) {
  const [search, setSearch] = useState('');
  const [submitted, setSubmitted] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setSubmitted(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);
  const firstKind = kinds[0];
  const query = useFoods({search: submitted, ...(kinds.length === 1 && firstKind ? {kind: firstKind} : {})});
  return (
    <div className="space-y-3">
      <SearchField
        label="Search"
        value={search}
        onChange={setSearch}
      />
      <InfiniteList
        query={query}
        label={firstKind === 'supplement' && kinds.length === 1 ? 'supplements' : 'foods'}
        singular="food"
        empty={<p className="text-muted-foreground">Nothing matches “{submitted}”.</p>}
      >
        {(food) => (
          <Button
            variant="ghost"
            className={pickRow}
            onPress={() => onPick(food)}
          >
            <span className="font-semibold">{food.name}</span>
            <span className="text-sm font-medium text-muted-foreground tabular-nums">
              {nutrientLine(food.nutrients)} · per {perLabel(food)}
            </span>
          </Button>
        )}
      </InfiniteList>
    </div>
  );
}

export function AmountFields({
  item,
  onChange,
  autoFocus = false,
}: {
  item: Item;
  onChange: (item: Item) => void;
  autoFocus?: boolean;
}) {
  const food = item.food;
  const valid = isAmount(item.amount);
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Input
          id={`amount-${item.id}`}
          aria-label={`Amount of ${food.name}`}
          inputMode="decimal"
          autoFocus={autoFocus}
          value={item.amount}
          aria-invalid={!valid}
          {...(!valid && {'aria-describedby': `amount-error-${item.id}`})}
          onChange={(event) => onChange({...item, amount: event.target.value})}
          className={cn(fieldClass, 'w-20 text-right tabular-nums')}
        />
        <SelectField
          aria-label={`Unit for ${food.name}`}
          value={item.unit}
          onChange={(unit) => onChange({...item, unit})}
          className="w-44 min-w-0"
        >
          {unitsOf(food).map((unit) => (
            <SelectItem
              key={unit.value}
              id={unit.value}
              textValue={unit.label}
            >
              {unit.label}
            </SelectItem>
          ))}
        </SelectField>
      </div>
      {valid ? (
        <p className="text-sm font-medium text-muted-foreground tabular-nums">{nutrientLine(itemNutrients(item))}</p>
      ) : (
        <p
          id={`amount-error-${item.id}`}
          className={errorClass}
        >
          Enter an amount above 0.
        </p>
      )}
    </div>
  );
}

export function TimeField({time, onChange}: {time: string; onChange: (time: string) => void}) {
  const id = useId();
  return (
    <div className="flex items-end gap-2">
      <label
        htmlFor={id}
        className="grid gap-1 text-sm font-medium"
      >
        Time (optional)
        <Input
          id={id}
          type="time"
          aria-label="Time (optional)"
          value={time}
          onChange={(event) => onChange(event.target.value)}
          className={cn(fieldClass, 'w-40 tabular-nums')}
        />
      </label>
      {time && (
        <Button
          size="sm"
          variant="ghost"
          onPress={() => onChange('')}
        >
          Any time
        </Button>
      )}
    </div>
  );
}

export function MealList({
  clientId,
  state,
  exclude,
  onPick,
  onCreate,
}: {
  clientId: string;
  state: State;
  exclude?: string;
  onPick: (preset: Preset) => void;
  onCreate?: () => void;
}) {
  const [search, setSearch] = useState('');
  const [submitted, setSubmitted] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setSubmitted(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);
  const query = useNutritionPresets(clientId, submitted);
  return (
    <div className="space-y-3">
      <SearchField
        label="Search meals"
        value={search}
        onChange={setSearch}
      />
      <InfiniteList
        query={query}
        label="meals"
        singular="meal"
        empty={<p className="text-muted-foreground">No meals match “{submitted}”.</p>}
      >
        {(preset) => {
          const uses = usesOf(state, preset.id);
          return (
            <Button
              variant="ghost"
              className={pickRow}
              isDisabled={preset.id === exclude}
              onPress={() => onPick(preset)}
            >
              <span className="font-semibold">{presetTitle(preset)}</span>
              <span className="text-sm font-medium text-muted-foreground">{presetSummary(preset)}</span>
              <span className="text-sm text-muted-foreground">
                {uses.length === 0
                  ? 'Not on any day'
                  : `On ${uses.map((use) => daysLabel(use.weekdays_mask ?? 0)).join(', ')}`}
              </span>
            </Button>
          );
        }}
      </InfiniteList>
      {onCreate && (
        <Button
          variant="ghost"
          className="w-full justify-start"
          onPress={onCreate}
        >
          <Plus />
          Create a new meal
        </Button>
      )}
    </div>
  );
}

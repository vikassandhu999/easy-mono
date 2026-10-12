import {Plus} from 'lucide-react';
import {createContext, type ReactNode, useContext, useEffect, useId, useState} from 'react';
import {type Food, useFoods} from '../api/foods';
import {useNutritionPresets} from '../api/nutrition-week';
import {Button} from '../ui/button';
import {cn} from '../ui/cn';
import {Dialog, DialogDescription, DialogHeader, DialogTitle} from '../ui/dialog';
import {FormError} from '../ui/form-error';
import {InfiniteList} from '../ui/infinite-list';
import {Input} from '../ui/input';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';
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
  weekdays,
} from './model';
import type {useSaveRecovery} from './save-recovery';

export const fieldClass =
  'h-11 rounded-xl border border-input bg-surface px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 aria-invalid:border-destructive';
export const errorClass = 'text-sm font-medium text-destructive';
export type Commit = (result: {undo_token: string}, message: string) => void;
export type Undo<T> = {message: string; before: T};
export const DraftGuard = createContext<(id: string, active: boolean, pending: boolean) => void>(() => undefined);
export function useDraftGuard(dirty: boolean, pending = false) {
  const register = useContext(DraftGuard);
  const id = useId();
  useEffect(() => {
    register(id, dirty || pending, pending);
    return () => register(id, false, false);
  }, [register, id, dirty, pending]);
}

export function SaveRecovery({recovery}: {recovery: ReturnType<typeof useSaveRecovery>}) {
  return (
    <div className="space-y-3">
      <FormError message={recovery.error} />
      {recovery.uncertain && (
        <Button
          variant="outline"
          isPending={recovery.checking}
          onPress={recovery.check}
        >
          Check saved week
        </Button>
      )}
      {recovery.conflict && (
        <Button
          variant="ghost"
          isDisabled={recovery.checking}
          onPress={recovery.discard}
        >
          Discard draft and view saved week
        </Button>
      )}
    </div>
  );
}

export function UndoToast<T>({
  undo,
  onUndo,
  onExpire,
  pending = false,
  error,
}: {
  undo: Undo<T> | null;
  onUndo: (before: T) => void;
  onExpire: () => void;
  pending?: boolean;
  error?: string;
}) {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (!undo || paused || pending || error) {
      return;
    }
    const timer = window.setTimeout(onExpire, 8000);
    return () => window.clearTimeout(timer);
  }, [undo, paused, pending, error, onExpire]);
  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4"
    >
      {undo && (
        <div className="flex max-w-md flex-wrap items-center gap-3 rounded-xl bg-foreground py-2 pr-2 pl-4 text-background shadow-lg">
          <span>{undo.message}</span>
          <Button
            size="sm"
            variant="ghost"
            className="text-background hover:bg-background/15 data-pressed:bg-background/25"
            isPending={pending}
            onHoverChange={setPaused}
            onFocusChange={setPaused}
            onPress={() => onUndo(undo.before)}
          >
            Undo
          </Button>
          {error && (
            <p
              role="alert"
              className="w-full pb-1 text-sm"
            >
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function EditDialog({
  title,
  description,
  dirty,
  pending = false,
  canClose = true,
  recovery,
  footer,
  onClose,
  children,
}: {
  title: string;
  description?: string;
  dirty: boolean;
  pending?: boolean;
  canClose?: boolean;
  recovery?: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  useDraftGuard(dirty || !canClose, pending || !canClose);
  return (
    <Dialog
      className="nutrition-dialog"
      isOpen
      isDismissable={!dirty && !pending && canClose}
      isKeyboardDismissDisabled={dirty || pending || !canClose}
      showCloseButton={!pending && canClose}
      onOpenChange={(open) => {
        if (!open && !pending && canClose) {
          onClose();
        }
      }}
    >
      <DialogHeader>
        <div className="space-y-1 pr-10">
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </div>
      </DialogHeader>
      <div className="dialog-body space-y-5">
        {recovery}
        <fieldset
          disabled={pending || !canClose}
          className="min-w-0 space-y-5"
        >
          {children}
        </fieldset>
      </div>
      {footer && (
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-x-3 gap-y-2 border-t border-border px-5 py-3">
          {footer}
        </div>
      )}
    </Dialog>
  );
}

export function WeekdayPicker({mask, onChange}: {mask: number; onChange: (mask: number) => void}) {
  return (
    <div
      role="group"
      aria-label="Days of the week"
      className="grid grid-cols-7 gap-1"
    >
      {weekdays.map((day) => {
        const on = (mask & day.bit) !== 0;
        return (
          <Button
            key={day.bit}
            size="xs"
            variant="outline"
            aria-pressed={on}
            aria-label={day.long}
            className={cn(
              'nutrition-weekday px-0 text-muted-foreground',
              on && 'border-foreground bg-muted font-bold text-foreground',
            )}
            onPress={() => onChange(mask ^ day.bit)}
          >
            {day.short.slice(0, 2)}
          </Button>
        );
      })}
    </div>
  );
}

export function SearchField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className="sticky -top-5 z-10 -mx-1 grid gap-2 bg-surface px-1 pt-1 pb-2 text-sm font-medium sm:-top-6"
    >
      {label}
      <Input
        id={id}
        type="search"
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(fieldClass, 'font-normal')}
      />
    </label>
  );
}

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

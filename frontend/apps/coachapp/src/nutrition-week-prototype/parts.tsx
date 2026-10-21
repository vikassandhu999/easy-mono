// PROTOTYPE. Dialogs and shared parts for the repeating nutrition week.
import {Plus} from 'lucide-react';
import {type ReactNode, useEffect, useRef, useState} from 'react';
import {Tab, TabList, TabPanel, Tabs} from 'react-aria-components';
import {Button} from '../ui/button';
import {cn} from '../ui/cn';
import {Dialog, DialogDescription, DialogHeader, DialogTitle} from '../ui/dialog';
import {
  actions,
  coreNutrients,
  type Day,
  daysLabel,
  daysOfTargets,
  type Food,
  foodOf,
  foods,
  type Item,
  isAmount,
  itemNutrients,
  type Kind,
  type NutrientKey,
  newId,
  newItem,
  nutrientLine,
  nutrients,
  type Preset,
  perLabel,
  presetOf,
  presetSummary,
  presetTitle,
  type Schedule,
  type State,
  type TargetDraft,
  type TargetMode,
  toBounds,
  toDraft,
  unitsOf,
  usesOf,
  weekdays,
} from './model';

// The message names what changed and where, so the coach can judge the undo (notifications-and-recovery).
export type Commit = (next: State, message: string) => void;

export const fieldClass =
  'h-11 rounded-xl border border-input bg-surface px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 aria-invalid:border-destructive';

export const errorClass = 'text-sm font-medium text-destructive';

export type Undo<T> = {message: string; before: T};

// The timer pauses while the pointer or focus is on Undo (WCAG 2.2.1).
export function UndoToast<T>({
  undo,
  onUndo,
  onExpire,
}: {
  undo: Undo<T> | null;
  onUndo: (before: T) => void;
  onExpire: () => void;
}) {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (!undo || paused) {
      return;
    }
    const timer = window.setTimeout(onExpire, 8000);
    return () => window.clearTimeout(timer);
  }, [undo, paused, onExpire]);
  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4"
    >
      {undo && (
        <div className="flex max-w-md items-center gap-3 rounded-xl bg-foreground py-2 pr-2 pl-4 text-background shadow-lg">
          <span>{undo.message}</span>
          <Button
            size="sm"
            variant="ghost"
            className="text-background hover:bg-background/15 data-pressed:bg-background/25"
            onHoverChange={setPaused}
            onFocusChange={setPaused}
            onPress={() => onUndo(undo.before)}
          >
            Undo
          </Button>
        </div>
      )}
    </div>
  );
}

// A dialog with unsaved edits does not close on a stray click or Escape; Cancel and the close button still work.
export function EditDialog({
  title,
  description,
  dirty,
  footer,
  onClose,
  children,
}: {
  title: string;
  description?: string;
  dirty: boolean;
  footer?: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Dialog
      isOpen
      isDismissable={!dirty}
      isKeyboardDismissDisabled={dirty}
      onOpenChange={(open) => {
        if (!open) {
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
      <div className="dialog-body space-y-5">{children}</div>
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
            className={cn('px-0 text-muted-foreground', on && 'border-foreground bg-muted font-bold text-foreground')}
            onPress={() => onChange(mask ^ day.bit)}
          >
            {day.short.slice(0, 2)}
          </Button>
        );
      })}
    </div>
  );
}

function SearchField({label, value, onChange}: {label: string; value: string; onChange: (value: string) => void}) {
  return (
    <label className="sticky -top-5 z-10 -mx-1 grid gap-2 bg-surface px-1 pt-1 pb-2 text-sm font-medium sm:-top-6">
      {label}
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(fieldClass, 'font-normal')}
      />
    </label>
  );
}

const pickRow = 'h-auto w-full flex-col items-start gap-0.5 whitespace-normal py-2 text-left';

// Search the catalogue. Each result shows its values and their basis (per 100 g, per 100 ml, per 1 capsule).
export function FoodList({kinds, onPick}: {kinds: Kind[]; onPick: (food: Food) => void}) {
  const [search, setSearch] = useState('');
  const matches = foods.filter((food) => food.name.toLowerCase().includes(search.trim().toLowerCase()));
  const groups = (
    [
      {kind: 'food', title: 'Foods'},
      {kind: 'supplement', title: 'Supplements'},
    ] as const
  )
    .filter((group) => kinds.includes(group.kind))
    .map((group) => ({...group, items: matches.filter((food) => food.kind === group.kind)}))
    .filter((group) => group.items.length > 0);
  return (
    <div className="space-y-3">
      <SearchField
        label="Search"
        value={search}
        onChange={setSearch}
      />
      {groups.length === 0 && <p className="text-muted-foreground">Nothing matches “{search.trim()}”.</p>}
      {groups.map((group) => (
        <section
          key={group.kind}
          className="space-y-1"
        >
          {kinds.length > 1 && <h3 className="text-sm font-semibold text-muted-foreground">{group.title}</h3>}
          <ul>
            {group.items.map((food) => (
              <li key={food.id}>
                <Button
                  variant="ghost"
                  className={pickRow}
                  onPress={() => onPick(food)}
                >
                  <span className="font-semibold">{food.name}</span>
                  <span className="text-sm font-medium text-muted-foreground tabular-nums">
                    {nutrientLine(food.per)} · per {perLabel(food)}
                  </span>
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

// Amount and unit of one item, with its calculated values or its error under them.
export function AmountFields({
  item,
  onChange,
  autoFocus = false,
}: {
  item: Item;
  onChange: (item: Item) => void;
  autoFocus?: boolean;
}) {
  const food = foodOf(item.foodId);
  if (!food) {
    return null;
  }
  const valid = isAmount(item.amount);
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <input
          id={`amount-${item.id}`}
          aria-label={`Amount of ${food.name}`}
          inputMode="decimal"
          // biome-ignore lint/a11y/noAutofocus: focus moves to the field the coach must fill next
          autoFocus={autoFocus}
          value={item.amount}
          aria-invalid={!valid}
          {...(!valid && {'aria-describedby': `amount-error-${item.id}`})}
          onChange={(event) => onChange({...item, amount: event.target.value})}
          className={cn(fieldClass, 'w-20 text-right tabular-nums')}
        />
        <select
          aria-label={`Unit for ${food.name}`}
          value={item.unit}
          onChange={(event) => onChange({...item, unit: event.target.value})}
          className={cn(fieldClass, 'w-44 min-w-0')}
        >
          {unitsOf(food).map((unit) => (
            <option
              key={unit.value}
              value={unit.value}
            >
              {unit.label}
            </option>
          ))}
        </select>
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

function TimeField({time, onChange}: {time: string; onChange: (time: string) => void}) {
  return (
    <div className="flex items-end gap-2">
      <label className="grid gap-1 text-sm font-medium">
        Time (optional)
        <input
          type="time"
          value={time}
          onChange={(event) => onChange(event.target.value)}
          className={cn(fieldClass, 'w-40 tabular-nums')}
        />
      </label>
      {/* ponytail: native time inputs have no reliable clear control */}
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

// Choose one of this client's meals: the same meal, not a copy (N35).
function MealList({
  state,
  exclude,
  onPick,
  onCreate,
}: {
  state: State;
  exclude?: string;
  onPick: (preset: Preset) => void;
  onCreate?: () => void;
}) {
  const [search, setSearch] = useState('');
  const match = (preset: Preset) =>
    preset.type === 'meal' && preset.id !== exclude && preset.name.toLowerCase().includes(search.trim().toLowerCase());
  const meals = state.presets.filter(match);
  const row = (preset: Preset) => {
    const uses = usesOf(state, preset.id);
    return (
      <li key={preset.id}>
        <Button
          variant="ghost"
          className={pickRow}
          onPress={() => onPick(preset)}
        >
          <span className="font-semibold">{presetTitle(preset)}</span>
          <span className="text-sm font-medium text-muted-foreground">{presetSummary(preset)}</span>
          <span className="text-sm text-muted-foreground">
            {uses.length === 0 ? 'Not on any day' : `On ${uses.map((use) => daysLabel(use.mask)).join(', ')}`}
          </span>
        </Button>
      </li>
    );
  };
  return (
    <div className="space-y-3">
      <SearchField
        label="Search meals"
        value={search}
        onChange={setSearch}
      />
      {meals.length > 0 ? (
        <ul>{meals.map(row)}</ul>
      ) : (
        <p className="text-muted-foreground">No meals match “{search.trim()}”.</p>
      )}
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

// Add to a day: a meal, a food or a supplement (N31). The UI never says "preset". Every path ends on one confirm
// step that asks for the time, so the coach does not have to reopen the new row.
type Pick = {kind: 'meal'; preset: Preset} | {kind: Kind; item: Item};

export function AddDialog({
  state,
  commit,
  day,
  onCreateMeal,
  onClose,
}: {
  state: State;
  commit: Commit;
  day: Day;
  onCreateMeal: () => void;
  onClose: () => void;
}) {
  const [picked, setPicked] = useState<Pick | null>(null);
  const [time, setTime] = useState('');
  const title = picked
    ? picked.kind === 'meal'
      ? presetTitle(picked.preset)
      : (foodOf(picked.item.foodId)?.name ?? '')
    : '';

  const add = () => {
    if (!picked) {
      return;
    }
    // A meal is the client's own; a food or supplement becomes a new one-item preset (N6).
    const preset: Preset =
      picked.kind === 'meal' ? picked.preset : {id: newId('p'), type: picked.kind, item: picked.item};
    commit(
      actions.addSchedule(actions.savePreset(state, preset), {presetId: preset.id, time: time || null, mask: day.bit}),
      `${title} added to ${day.long}.`,
    );
    onClose();
  };

  return (
    <EditDialog
      title={picked ? `Add ${title} to ${day.long}` : `Add to ${day.long}`}
      dirty={picked !== null}
      onClose={onClose}
      footer={
        picked && (
          <>
            <Button
              variant="ghost"
              className="mr-auto"
              onPress={() => setPicked(null)}
            >
              Back
            </Button>
            <Button
              isDisabled={picked.kind !== 'meal' && !isAmount(picked.item.amount)}
              onPress={add}
            >
              Add to {day.long}
            </Button>
          </>
        )
      }
    >
      {picked ? (
        <>
          {picked.kind === 'meal' ? (
            <p className="text-muted-foreground">{presetSummary(picked.preset)}</p>
          ) : (
            <AmountFields
              item={picked.item}
              onChange={(item) => setPicked({...picked, item})}
              autoFocus
            />
          )}
          <TimeField
            time={time}
            onChange={setTime}
          />
        </>
      ) : (
        <Tabs>
          <TabList
            aria-label="What to add"
            className="grid grid-cols-3 gap-1 rounded-2xl bg-muted p-1"
          >
            {(['Meal', 'Food', 'Supplement'] as const).map((label) => (
              <Tab
                key={label}
                id={label}
                className="flex min-h-11 cursor-pointer items-center justify-center rounded-xl text-sm font-semibold text-muted-foreground outline-none data-focus-visible:ring-2 data-focus-visible:ring-ring data-selected:bg-surface data-selected:text-foreground data-selected:shadow-sm"
              >
                {label}
              </Tab>
            ))}
          </TabList>
          <TabPanel
            id="Meal"
            className="pt-4"
          >
            <MealList
              state={state}
              onCreate={onCreateMeal}
              onPick={(preset) => setPicked({kind: 'meal', preset})}
            />
          </TabPanel>
          {(['food', 'supplement'] as const).map((kind) => (
            <TabPanel
              key={kind}
              id={kind === 'food' ? 'Food' : 'Supplement'}
              className="pt-4"
            >
              <FoodList
                kinds={[kind]}
                onPick={(food) => setPicked({kind, item: newItem(food)})}
              />
            </TabPanel>
          ))}
        </Tabs>
      )}
    </EditDialog>
  );
}

const usesText = (uses: Schedule[]) =>
  uses.map((use) => `${daysLabel(use.mask)}${use.time ? ` at ${use.time}` : ''}`).join(', ');

export function ScheduleDialog({
  state,
  commit,
  schedule,
  day,
  onEditMeal,
  onClose,
}: {
  state: State;
  commit: Commit;
  schedule: Schedule;
  day: Day;
  onEditMeal: (preset: Preset) => void;
  onClose: () => void;
}) {
  const original = presetOf(state, schedule.presetId);
  const [presetId, setPresetId] = useState(schedule.presetId);
  const [time, setTime] = useState(schedule.time ?? '');
  const [mask, setMask] = useState(schedule.mask);
  const [item, setItem] = useState(original && original.type !== 'meal' ? original.item : null);
  const [changing, setChanging] = useState(false);
  const preset = presetOf(state, presetId);
  if (!preset || !original) {
    return null;
  }
  const otherUses = usesOf(state, preset.id).filter((use) => use.id !== schedule.id);
  const timingChanged = presetId !== schedule.presetId || (time || null) !== schedule.time || mask !== schedule.mask;
  const itemChanged = original.type !== 'meal' && JSON.stringify(item) !== JSON.stringify(original.item);
  const dirty = timingChanged || itemChanged;
  const title = presetTitle(preset);
  const staysOn = schedule.mask & ~day.bit;
  const blocked =
    mask === 0
      ? `Pick at least one day, or use Remove from ${day.long}.`
      : item && !isAmount(item.amount)
        ? 'Fix the amount to save.'
        : null;

  const save = () => {
    let next = state;
    if (item && preset.type !== 'meal' && itemChanged) {
      next = actions.savePreset(next, {...preset, item});
    }
    if (timingChanged) {
      next = actions.updateSchedule(next, schedule, {presetId, time: time || null, mask});
    }
    commit(next, `${title} saved for ${daysLabel(mask)}.`);
    onClose();
  };

  if (changing) {
    return (
      <EditDialog
        title="Use a different meal"
        description={`For ${daysLabel(mask)}`}
        dirty
        onClose={onClose}
        footer={
          <Button
            variant="ghost"
            className="mr-auto"
            onPress={() => setChanging(false)}
          >
            Back
          </Button>
        }
      >
        <MealList
          state={state}
          exclude={presetId}
          onPick={(picked) => {
            setPresetId(picked.id);
            setChanging(false);
          }}
        />
      </EditDialog>
    );
  }

  return (
    <EditDialog
      title={title}
      description={`${day.long} · ${schedule.time ?? 'any time'}`}
      dirty={dirty}
      onClose={onClose}
      footer={
        <>
          <div className="mr-auto space-y-0.5">
            <Button
              size="sm"
              variant="destructive"
              onPress={() => {
                commit(actions.removeFromDay(state, schedule, day.bit), `${title} removed from ${day.long}.`);
                onClose();
              }}
            >
              Remove from {day.long}
            </Button>
            {staysOn !== 0 && <p className="px-1 text-sm text-muted-foreground">Stays on {daysLabel(staysOn)}.</p>}
          </div>
          {blocked && dirty && <p className={cn(errorClass, 'w-full text-right sm:w-auto')}>{blocked}</p>}
          <Button
            variant="ghost"
            onPress={onClose}
          >
            Cancel
          </Button>
          <Button
            isDisabled={!dirty || blocked !== null}
            onPress={save}
          >
            Save
          </Button>
        </>
      }
    >
      <section className="space-y-2 rounded-xl border border-border p-3">
        {preset.type === 'meal' ? (
          <>
            <h3 className="text-sm font-medium text-muted-foreground">
              {preset.options.length > 1 ? 'The client chooses one option' : 'Meal'}
            </h3>
            <ul className="space-y-1">
              {preset.options.map((option, index) => (
                <li key={option.id}>
                  {index > 0 && <span className="text-sm text-muted-foreground">or </span>}
                  <span className="font-semibold">{presetSummary({...preset, options: [option]})}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                size="sm"
                variant="outline"
                isDisabled={dirty}
                onPress={() => onEditMeal(preset)}
              >
                Edit meal
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onPress={() => setChanging(true)}
              >
                Use a different meal
              </Button>
            </div>
            {dirty && (
              <p className="text-sm text-muted-foreground">Save or cancel your changes before you edit the meal.</p>
            )}
          </>
        ) : (
          item && (
            <>
              <h3 className="text-sm font-medium text-muted-foreground">Amount</h3>
              <AmountFields
                item={item}
                onChange={setItem}
              />
            </>
          )
        )}
        {otherUses.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Also on {usesText(otherUses)}.{' '}
            {preset.type === 'meal' ? 'Editing the meal changes it there too.' : 'A new amount applies there too.'}
          </p>
        )}
      </section>
      <TimeField
        time={time}
        onChange={setTime}
      />
      <div className="space-y-2">
        <p className="text-sm font-medium">Every week on</p>
        <WeekdayPicker
          mask={mask}
          onChange={setMask}
        />
        <p className="text-sm text-muted-foreground">
          {mask === 0 ? 'No days picked.' : `Saving changes ${daysLabel(mask)}, from today.`}
        </p>
      </div>
    </EditDialog>
  );
}

const modes: Array<{value: TargetMode; label: string}> = [
  {value: 'none', label: 'No target'},
  {value: 'exact', label: 'Exactly'},
  {value: 'min', label: 'At least'},
  {value: 'max', label: 'At most'},
  {value: 'range', label: 'Between'},
];

type Values = Partial<Record<NutrientKey, TargetDraft>>;
const valuesOf = (state: State, targetsId: string | null): Values => {
  const set = state.nutritionTargets.find((row) => row.id === targetsId);
  return Object.fromEntries(nutrients.map((nutrient) => [nutrient.key, toDraft(set?.targets[nutrient.key])]));
};

// The editor shows a mode per nutrient; only bounds are saved (N33).
export function TargetsDialog({
  state,
  commit,
  day,
  onClose,
}: {
  state: State;
  commit: Commit;
  day: Day;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(state);
  const [targetsId, setTargetsId] = useState(
    state.targetSchedules.find((row) => row.mask & day.bit)?.targetsId ?? null,
  );
  const selected = draft.nutritionTargets.find((set) => set.id === targetsId);
  const [name, setName] = useState(selected?.name ?? '');
  const [values, setValues] = useState<Values>(() => valuesOf(state, targetsId));
  const [added, setAdded] = useState<NutrientKey[]>([]);
  const [dirty, setDirty] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const body = useRef<HTMLDivElement>(null);
  const otherDays = targetsId ? daysOfTargets(draft, targetsId) & ~day.bit : 0;
  const shown = nutrients.filter(
    (nutrient) =>
      coreNutrients.includes(nutrient) || values[nutrient.key]?.mode !== 'none' || added.includes(nutrient.key),
  );
  const hidden = nutrients.filter((nutrient) => !shown.includes(nutrient));
  const rows = shown.map((nutrient) => {
    const value = values[nutrient.key] ?? toDraft(undefined);
    return {nutrient, value, result: toBounds(value)};
  });
  const invalid = rows.some(({result}) => typeof result === 'string') || (selected !== undefined && !name.trim());

  // Keep what was typed into the set being left, so switching sets never drops edits.
  const withEdits = (from: State) => {
    if (!selected) {
      return from;
    }
    const targets = Object.fromEntries(
      rows.flatMap(({nutrient, result}) => (result && typeof result !== 'string' ? [[nutrient.key, result]] : [])),
    );
    return actions.saveTargets(from, {...selected, name: name.trim() || selected.name, targets});
  };
  const choose = (id: string | null, next: State) => {
    setDraft(actions.scheduleTargets(next, day.bit, id));
    setTargetsId(id);
    setName(next.nutritionTargets.find((set) => set.id === id)?.name ?? '');
    setValues(valuesOf(next, id));
    setAdded([]);
    setAttempted(false);
    setDirty(true);
  };
  const save = () => {
    if (invalid) {
      setAttempted(true);
      requestAnimationFrame(() => body.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    const message = selected
      ? `${name.trim()} saved${otherDays ? ` for ${daysLabel(otherDays | day.bit)}` : ` for ${day.long}`}.`
      : `${day.long} has no targets.`;
    commit(withEdits(draft), message);
    onClose();
  };

  return (
    <EditDialog
      title={`${day.long} targets`}
      dirty={dirty}
      onClose={onClose}
      footer={
        <>
          <p className="mr-auto text-sm text-muted-foreground">Applies from today.</p>
          {attempted && invalid && <p className={errorClass}>Fix the marked targets.</p>}
          <Button
            variant="ghost"
            onPress={onClose}
          >
            Cancel
          </Button>
          <Button onPress={save}>Save</Button>
        </>
      }
    >
      <div
        ref={body}
        className="space-y-5"
      >
        <label className="grid gap-1 text-sm font-medium">
          Targets on {day.long}
          <select
            value={targetsId ?? ''}
            onChange={(event) => {
              const value = event.target.value;
              const next = withEdits(draft);
              if (value === 'new') {
                const set = {id: newId('t'), name: 'New targets', targets: {}};
                choose(set.id, actions.saveTargets(next, set));
                return;
              }
              choose(value || null, next);
            }}
            className={fieldClass}
          >
            <option value="">No targets</option>
            {draft.nutritionTargets.map((set) => (
              <option
                key={set.id}
                value={set.id}
              >
                {set.name}
              </option>
            ))}
            <option value="new">New target set…</option>
          </select>
        </label>

        {selected && (
          <section className="space-y-4">
            {otherDays !== 0 && (
              <div className="space-y-2 rounded-xl bg-muted px-3 py-2 text-sm">
                <p>
                  {selected.name} is also used on {daysLabel(otherDays)}. Changing its values changes those days too.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onPress={() => {
                    // The values being edited move to a new set that only this day uses.
                    const copy = {id: newId('t'), name: `${name.trim() || selected.name} (${day.short})`, targets: {}};
                    setDraft(actions.scheduleTargets(actions.saveTargets(draft, copy), day.bit, copy.id));
                    setTargetsId(copy.id);
                    setName(copy.name);
                    setDirty(true);
                  }}
                >
                  Use a copy for {day.long} only
                </Button>
              </div>
            )}
            <label className="grid gap-1 text-sm font-medium">
              Name
              <input
                value={name}
                aria-invalid={attempted && !name.trim()}
                onChange={(event) => {
                  setName(event.target.value);
                  setDirty(true);
                }}
                className={fieldClass}
              />
              {attempted && !name.trim() && <span className={errorClass}>Add a name.</span>}
            </label>
            <div className="space-y-3">
              {rows.map(({nutrient, value, result}) => {
                const edit = (patch: Partial<TargetDraft>) => {
                  setValues({...values, [nutrient.key]: {...value, ...patch}});
                  setDirty(true);
                };
                const error = attempted && typeof result === 'string' ? result : null;
                const errorId = `target-error-${nutrient.key}`;
                const numberProps = {
                  inputMode: 'decimal' as const,
                  'aria-invalid': error !== null,
                  ...(error && {'aria-describedby': errorId}),
                  className: cn(fieldClass, 'w-20 text-right tabular-nums'),
                };
                return (
                  <div
                    key={nutrient.key}
                    role="group"
                    aria-label={nutrient.label}
                    className="grid grid-cols-[6.5rem_1fr] items-start gap-x-3 gap-y-1"
                  >
                    <span className="pt-3 text-sm font-medium">{nutrient.label}</span>
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        aria-label={`${nutrient.label} target`}
                        value={value.mode}
                        onChange={(event) => edit({mode: event.target.value as TargetMode})}
                        className={cn(fieldClass, 'w-32')}
                      >
                        {modes.map((mode) => (
                          <option
                            key={mode.value}
                            value={mode.value}
                          >
                            {mode.label}
                          </option>
                        ))}
                      </select>
                      {value.mode !== 'none' && (
                        <span className="flex items-center gap-2">
                          {value.mode !== 'max' && (
                            <input
                              aria-label={value.mode === 'range' ? `${nutrient.label} from` : `${nutrient.label} value`}
                              value={value.min}
                              onChange={(event) => edit({min: event.target.value})}
                              {...numberProps}
                            />
                          )}
                          {value.mode === 'range' && <span>to</span>}
                          {(value.mode === 'max' || value.mode === 'range') && (
                            <input
                              aria-label={value.mode === 'range' ? `${nutrient.label} to` : `${nutrient.label} value`}
                              value={value.max}
                              onChange={(event) => edit({max: event.target.value})}
                              {...numberProps}
                            />
                          )}
                          <span className="text-sm text-muted-foreground">{nutrient.unit}</span>
                        </span>
                      )}
                    </div>
                    {error && (
                      <p
                        id={errorId}
                        className={cn(errorClass, 'col-start-2')}
                      >
                        {error}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            {hidden.length > 0 && (
              <select
                aria-label="Add nutrient"
                value=""
                onChange={(event) => setAdded([...added, event.target.value as NutrientKey])}
                className={cn(fieldClass, 'w-48')}
              >
                <option value="">Add nutrient…</option>
                {hidden.map((nutrient) => (
                  <option
                    key={nutrient.key}
                    value={nutrient.key}
                  >
                    {nutrient.label}
                  </option>
                ))}
              </select>
            )}
          </section>
        )}
      </div>
    </EditDialog>
  );
}

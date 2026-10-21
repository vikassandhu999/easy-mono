import {Plus, RefreshCw, X} from 'lucide-react';
import {useState} from 'react';
import {Button} from '../ui/button';
import {Confirm} from '../ui/confirm';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';
import {
  amountText,
  dayLabel,
  type Food,
  type FoodLog,
  type MealDraft,
  type NutritionLog,
  newFoodLog,
  type Option,
  optionLabel,
  type Preset,
  parseAmount,
  presetTitle,
  totalOf,
  unitsOf,
  valuesLine,
} from './model';
import {Choice, Field, FoodSearchSheet, ScreenHeader, useFocusOnMount} from './parts';

type DraftItem = MealDraft['items'][number];
const asDraft = (row: FoodLog): DraftItem => ({...row, input: String(row.amount)});
const prescribedItems = (option: Option | undefined) =>
  (option?.items ?? []).map((row) => asDraft(newFoodLog(row.food, row.amount, row.unit, row.id)));
// True while the foods are still exactly the option's plan (ids aside).
const matchesPlan = (items: DraftItem[], option: Option) => {
  const plain = (rows: DraftItem[]) => JSON.stringify(rows.map(({id: _id, ...rest}) => rest));
  return plain(items) === plain(prescribedItems(option));
};

export function MealLogger({
  date,
  preset,
  time,
  saved,
  draft: kept,
  baseDraft,
  pending,
  error,
  draftStatus,
  back,
  onDraft,
  onSave,
  onDelete,
  onClose,
}: {
  date: string;
  scheduleId: string | null;
  preset: Preset | null; // null = food that was not planned
  time: string | null;
  saved: NutritionLog | undefined;
  draft: MealDraft | undefined;
  baseDraft: MealDraft;
  pending: boolean;
  error: string;
  draftStatus: React.ReactNode;
  back: string;
  onDraft: (draft: MealDraft | null) => void;
  onSave: (log: Omit<NutritionLog, 'id' | 'type'> & {id?: string}) => void;
  onDelete: (log: NutritionLog) => void;
  onClose: () => void;
}) {
  const heading = useFocusOnMount();
  const options = preset?.type === 'meal' ? preset.options : [];
  const [base] = useState<MealDraft>(baseDraft);
  const [draft, setDraftState] = useState<MealDraft>(kept ?? base);
  // The banner is for a draft restored from an earlier visit, not for edits made now.
  const [restored] = useState(Boolean(kept));
  const [picking, setPicking] = useState<{replace: DraftItem | null} | null>(
    preset || saved || kept ? null : {replace: null},
  );
  const [switching, setSwitching] = useState<Option | null>(null);
  const [removed, setRemoved] = useState<DraftItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(base);

  const setDraft = (next: MealDraft) => {
    if (pending) {
      return;
    }
    setDraftState(next);
    onDraft(JSON.stringify(next) === JSON.stringify(base) ? null : next);
  };
  const setItems = (items: DraftItem[]) => setDraft({...draft, items});

  const option = options.find((row) => row.id === draft.optionId);
  const needsOption = options.length > 1 && !option;
  const missed = (option?.items ?? []).filter((row) => !draft.items.some((logged) => logged.mealItemId === row.id));
  const amounts = draft.items.map((row) => parseAmount(row.input));
  const problem = needsOption
    ? 'Choose what you ate.'
    : !draft.time
      ? 'Enter the time you ate.'
      : draft.items.length === 0
        ? 'Add at least one food.'
        : amounts.some((value) => value === null)
          ? 'Enter an amount above 0 for each food.'
          : null;
  const counted = draft.items.flatMap((row, index) => (amounts[index] ? [{...row, amount: amounts[index]}] : []));
  const title = preset ? presetTitle(preset) : 'Food you ate';
  const choose = (next: Option) => setDraft({...draft, optionId: next.id, items: prescribedItems(next)});

  return (
    <main className="page pb-40">
      <fieldset
        disabled={pending}
        className="contents"
      >
        <ScreenHeader
          title={title}
          subtitle={`${dayLabel(date)}${time ? ` · planned ${time}` : ''}`}
          back={back}
          onBack={() => {
            if (!pending) {
              onClose();
            }
          }}
          headingRef={heading}
        />

        {restored && dirty && (
          <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl bg-muted px-4 py-3">
            <p className="font-semibold">You have unsaved changes.</p>
            <Button
              size="sm"
              variant="ghost"
              onPress={() => {
                setDraftState(base);
                onDraft(null);
              }}
            >
              Discard changes
            </Button>
          </div>
        )}

        {preset?.type === 'meal' && preset.instructions && (
          <p className="mb-5 rounded-2xl bg-[var(--coach)] px-4 py-3 leading-relaxed">{preset.instructions}</p>
        )}

        <Field
          label="Time eaten"
          type="time"
          value={draft.time}
          onChange={(value) => setDraft({...draft, time: value})}
          error={draft.time ? null : 'Enter the time you ate.'}
          className="mb-6 w-44"
        />

        {options.length > 1 && (
          <fieldset className="mb-6 grid gap-2">
            <legend className="mb-2 text-lg font-bold">What did you eat?</legend>
            <Choice
              label="What did you eat?"
              value={draft.optionId ?? undefined}
              options={options.map((row) => ({value: row.id, label: optionLabel(row)}))}
              onChange={(id) => {
                const next = options.find((row) => row.id === id);
                if (!next) {
                  return;
                }
                // Switching replaces the foods; ask first when the client already changed them.
                if (option && !matchesPlan(draft.items, option)) {
                  setSwitching(next);
                } else {
                  choose(next);
                }
              }}
            />
          </fieldset>
        )}

        {!needsOption && (
          <section
            aria-label="Foods"
            // A long unit label must not widen the column past the screen.
            className="grid grid-cols-[minmax(0,1fr)] gap-3"
          >
            {draft.items.length === 0 && <p className="text-muted-foreground">No foods yet.</p>}
            {draft.items.map((row, index) => (
              <ItemRow
                key={row.id}
                row={row}
                accessibleName={
                  draft.items.filter((other) => other.food.name === row.food.name).length > 1
                    ? `${row.food.name} (item ${index + 1})`
                    : row.food.name
                }
                option={option}
                onChange={(next) => setItems(draft.items.map((other) => (other.id === row.id ? next : other)))}
                onReplace={() => setPicking({replace: row})}
                onRemove={() => {
                  setItems(draft.items.filter((other) => other.id !== row.id));
                  setRemoved(row);
                }}
              />
            ))}
            {removed && !removed.mealItemId && (
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-muted px-4 py-2">
                <p>{removed.food.name} removed.</p>
                <Button
                  size="sm"
                  variant="ghost"
                  onPress={() => {
                    setItems([...draft.items, removed]);
                    setRemoved(null);
                  }}
                >
                  Undo
                </Button>
              </div>
            )}
            {missed.length > 0 && (
              <div className="rounded-2xl bg-muted px-4 py-3">
                <p className="font-semibold">Not eaten</p>
                <ul className="mt-1 grid gap-1">
                  {missed.map((row) => (
                    <li
                      key={row.id}
                      className="flex items-center justify-between gap-3"
                    >
                      <span>
                        {row.food.name} · {amountText(row.food, row.amount, row.unit)}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`Add back ${row.food.name}`}
                        onPress={() =>
                          setItems([...draft.items, asDraft(newFoodLog(row.food, row.amount, row.unit, row.id))])
                        }
                      >
                        Add back
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Button
              variant="outline"
              onPress={() => setPicking({replace: null})}
            >
              <Plus />
              Add food
            </Button>
          </section>
        )}

        {draftStatus}
        {saved && (
          <Button
            variant="destructive"
            className="mt-12"
            onPress={() => setConfirmDelete(true)}
          >
            Delete record
          </Button>
        )}

        <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto grid max-w-[30rem] gap-2">
            <p className="text-sm font-semibold tabular-nums">Total: {valuesLine(totalOf(counted))}</p>
            {problem && (
              <p
                aria-live="polite"
                className="text-sm font-medium text-destructive"
              >
                {problem}
              </p>
            )}
            {error && (
              <p
                role="alert"
                className="text-sm font-medium text-destructive"
              >
                {error} Your changes stay on this device. Try Save again.
              </p>
            )}
            <Button
              isPending={pending}
              isDisabled={problem !== null || pending}
              onPress={() =>
                onSave({
                  ...(draft.id ? {id: draft.id} : {}),
                  date: draft.date,
                  time: draft.time,
                  scheduleId: draft.scheduleId,
                  presetId: draft.presetId,
                  optionId: draft.optionId,
                  items: counted.map(({input: _, ...row}) => row),
                })
              }
            >
              {saved ? 'Save changes' : 'Save'}
            </Button>
          </div>
        </footer>
      </fieldset>
      {picking && (
        <FoodSearchSheet
          title={picking.replace ? `Replace ${picking.replace.food.name}` : 'Add food'}
          onClose={() => setPicking(null)}
          onPick={(food: Food) => {
            const replace = picking.replace;
            const unit =
              food.servings[0]?.label ?? (food.basis === '1unit' ? 'unit' : food.basis === '100ml' ? 'ml' : 'g');
            const amount = food.servings[0] || food.basis === '1unit' ? 1 : 100;
            // A replacement keeps the prescribed item's link (N39): "Potatoes instead of rice".
            const added = asDraft(newFoodLog(food, amount, unit, replace?.mealItemId ?? null));
            setItems(
              replace ? draft.items.map((row) => (row.id === replace.id ? added : row)) : [...draft.items, added],
            );
            setPicking(null);
          }}
        />
      )}
      {switching && (
        <Confirm
          title={`Switch to ${optionLabel(switching)}?`}
          action={`Switch to ${optionLabel(switching)}`}
          cancel="Keep my changes"
          pending={pending}
          onConfirm={() => {
            choose(switching);
            setSwitching(null);
          }}
          onClose={() => setSwitching(null)}
        >
          The foods you changed are replaced by this option's foods.
        </Confirm>
      )}
      {confirmDelete && saved && (
        <Confirm
          title={`Delete ${title}?`}
          action="Delete record"
          cancel="Cancel"
          destructive
          pending={pending}
          onConfirm={() => onDelete(saved)}
          onClose={() => setConfirmDelete(false)}
        >
          {saved.items.map((row) => row.food.name).join(', ')} · {valuesLine(totalOf(saved.items)).split(' · ')[0]} is
          removed. The day shows it as not recorded.
        </Confirm>
      )}
    </main>
  );
}

function ItemRow({
  row,
  accessibleName,
  option,
  onChange,
  onReplace,
  onRemove,
}: {
  row: DraftItem;
  accessibleName: string;
  option: Option | undefined;
  onChange: (row: DraftItem) => void;
  onReplace: () => void;
  onRemove: () => void;
}) {
  const planned = option?.items.find((item) => item.id === row.mealItemId);
  const replaced = planned && planned.food.id !== row.food.id ? planned.food : null;
  const amount = parseAmount(row.input);
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold">{row.food.name}</p>
          <p className="text-sm text-muted-foreground">
            {replaced
              ? `Instead of ${replaced.name}`
              : planned
                ? `${amountText(row.food, planned.amount, planned.unit)} planned`
                : option
                  ? 'Extra'
                  : ''}
          </p>
        </div>
        {/* Spaced apart from the fields and from each other to avoid mis-taps. */}
        <div className="flex shrink-0 gap-2">
          <Button
            size="icon-xs"
            variant="ghost"
            aria-label={`Replace ${accessibleName}`}
            onPress={onReplace}
          >
            <RefreshCw />
          </Button>
          <Button
            size="icon-xs"
            variant="ghost"
            aria-label={`Remove ${accessibleName}`}
            onPress={onRemove}
          >
            <X />
          </Button>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-[6rem_minmax(0,1fr)] items-start gap-2">
        <Field
          label={`Amount of ${accessibleName}`}
          hideLabel
          inputMode="decimal"
          value={row.input}
          onChange={(input) => onChange({...row, input})}
          error={amount === null ? 'Enter an amount above 0.' : null}
          inputClassName="text-right tabular-nums"
        />
        <SelectField
          aria-label={`Unit for ${accessibleName}`}
          value={row.unit}
          onChange={(unit) => onChange({...row, unit})}
        >
          {unitsOf(row.food).map((unit) => (
            <SelectItem
              key={unit.value}
              id={unit.value}
            >
              {unit.label}
            </SelectItem>
          ))}
        </SelectField>
      </div>
      {amount !== null && (
        <p className="mt-2 text-sm font-medium text-muted-foreground tabular-nums">
          {valuesLine(totalOf([{...row, amount}]))}
        </p>
      )}
    </div>
  );
}

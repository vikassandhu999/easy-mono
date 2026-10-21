// PROTOTYPE. The meal editor: name, instructions and options (N4, N5, N30). One option = a fixed meal; two or more =
// the client chooses one. Saving changes every day that uses this meal, from today (N17).
import {ArrowLeft, Check, Plus, X} from 'lucide-react';
import {useCallback, useRef, useState} from 'react';
import {Button} from '../ui/button';
import {cn} from '../ui/cn';
import {
  type Day,
  daysLabel,
  foodOf,
  type Item,
  isAmount,
  type Meal,
  newItem,
  newOption,
  type Option,
  type State,
  totalLine,
  usesOf,
} from './model';
import {AmountFields, EditDialog, errorClass, FoodList, fieldClass, type Undo, UndoToast} from './parts';

type Problem = {key: string; message: string};

function problemsOf(meal: Meal): Problem[] {
  const problems: Problem[] = [];
  if (!meal.name.trim()) {
    problems.push({key: 'name', message: 'Add a name.'});
  }
  meal.options.forEach((option, index) => {
    if (option.items.length === 0) {
      problems.push({key: option.id, message: `Add a food to option ${index + 1}.`});
    }
    for (const item of option.items) {
      if (!isAmount(item.amount)) {
        problems.push({key: item.id, message: 'Fix the amounts.'});
      }
    }
  });
  return problems;
}

export function MealEditor({
  state,
  initial,
  newOn,
  onSave,
  onClose,
}: {
  state: State;
  initial: Meal;
  newOn: Day | null; // a new meal is added to this day when saved
  onSave: (meal: Meal) => void;
  onClose: () => void;
}) {
  const [meal, setMeal] = useState(initial);
  const [picking, setPicking] = useState<string | null>(null); // option id
  const [focusId, setFocusId] = useState<string | null>(null); // the option that was just added
  const [attempted, setAttempted] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [undo, setUndo] = useState<Undo<Meal> | null>(null);
  const clearUndo = useCallback(() => setUndo(null), []);
  const main = useRef<HTMLElement>(null);
  const uses = newOn ? [] : usesOf(state, meal.id);
  const days = uses.reduce((mask, use) => mask | use.mask, 0);
  const dirty = JSON.stringify(meal) !== JSON.stringify(initial);
  const problems = attempted ? problemsOf(meal) : [];
  const problem = (key: string) => problems.find((row) => row.key === key)?.message;
  const saveLabel = newOn
    ? `Add to ${newOn.long}`
    : days === 0
      ? 'Save'
      : days === 127
        ? 'Save for every day'
        : `Save for ${daysLabel(days)}`;

  const editOption = (option: Option) =>
    setMeal({...meal, options: meal.options.map((row) => (row.id === option.id ? option : row))});
  const remove = (message: string, next: Meal) => {
    setUndo({message, before: meal});
    setMeal(next);
  };
  const save = () => {
    if (problemsOf(meal).length > 0) {
      setAttempted(true);
      requestAnimationFrame(() =>
        main.current?.querySelector<HTMLElement>('[aria-invalid="true"], [data-problem]')?.focus(),
      );
      return;
    }
    onSave({...meal, name: meal.name.trim()});
  };
  const leave = () => (dirty ? setLeaving(true) : onClose());

  return (
    <div className="min-h-dvh bg-background pb-24">
      <p className="bg-muted px-4 py-2 text-center text-sm font-medium text-muted-foreground">
        Prototype. Reload resets the week.
      </p>
      <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-2 px-4 py-2 sm:px-6">
          <Button
            variant="ghost"
            className="min-w-11 shrink-0 px-2 text-muted-foreground"
            aria-label="Back to Maya Patel’s nutrition week"
            onPress={leave}
          >
            <ArrowLeft />
            {/* A phone shows the arrow only, so Discard and Save keep their full labels. */}
            <span className="hidden sm:inline">Maya Patel · Nutrition week</span>
          </Button>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {dirty || newOn ? (
              <>
                <span
                  role="status"
                  className="hidden text-sm font-medium text-muted-foreground sm:inline"
                >
                  {problems.length > 0 ? `Fix ${problems.length} to save` : 'Unsaved changes'}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onPress={newOn ? leave : () => setLeaving(true)}
                >
                  Discard
                </Button>
                <Button
                  size="sm"
                  onPress={save}
                >
                  {saveLabel}
                </Button>
              </>
            ) : (
              <span
                role="status"
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground"
              >
                <Check
                  aria-hidden="true"
                  size={16}
                />
                Saved
              </span>
            )}
          </div>
        </div>
      </div>

      <main
        ref={main}
        className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6"
      >
        <div className="space-y-2">
          <label className="grid gap-1">
            <span className="text-sm font-medium text-muted-foreground">Meal name</span>
            <input
              value={meal.name}
              placeholder="Breakfast"
              aria-invalid={problem('name') !== undefined}
              {...(problem('name') && {'aria-describedby': 'name-error'})}
              onChange={(event) => setMeal({...meal, name: event.target.value})}
              className={cn(
                fieldClass,
                'h-14 w-full text-2xl font-bold placeholder:font-semibold placeholder:text-muted-foreground',
              )}
            />
          </label>
          {problem('name') && (
            <p
              id="name-error"
              className={errorClass}
            >
              {problem('name')}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            {newOn
              ? `New meal for ${newOn.long}. Set its time in the week.`
              : uses.length === 0
                ? 'Not on any day.'
                : `On ${uses.map((use) => `${daysLabel(use.mask)} at ${use.time ?? 'any time'}`).join(', ')}. Saving changes all of these from today.`}
          </p>
        </div>

        <label className="grid gap-1">
          <span className="text-sm font-medium text-muted-foreground">Instructions for the client (optional)</span>
          <textarea
            rows={2}
            value={meal.instructions}
            onChange={(event) => setMeal({...meal, instructions: event.target.value})}
            className={cn(fieldClass, 'h-auto w-full py-2 leading-relaxed')}
          />
        </label>

        {meal.options.length > 1 && (
          <p className="font-medium">The client chooses one of these {meal.options.length} options.</p>
        )}

        {meal.options.map((option, index) => (
          <div
            key={option.id}
            className="space-y-6"
          >
            {index > 0 && (
              <p
                aria-hidden="true"
                className="text-center text-sm font-semibold text-muted-foreground"
              >
                or
              </p>
            )}
            <OptionCard
              option={option}
              number={index + 1}
              single={meal.options.length === 1}
              focusId={focusId}
              problem={problem(option.id)}
              onChange={editOption}
              onAddFood={() => setPicking(option.id)}
              onRemoveItem={(item) =>
                remove(`${foodOf(item.foodId)?.name ?? 'Food'} removed.`, {
                  ...meal,
                  options: meal.options.map((row) =>
                    row.id === option.id ? {...row, items: row.items.filter((other) => other.id !== item.id)} : row,
                  ),
                })
              }
              onRemove={() =>
                remove(`Option ${index + 1} removed.`, {
                  ...meal,
                  options: meal.options.filter((row) => row.id !== option.id),
                })
              }
            />
          </div>
        ))}

        <Button
          variant="outline"
          onPress={() => {
            const option = newOption();
            setMeal({...meal, options: [...meal.options, option]});
            setFocusId(option.id);
          }}
        >
          <Plus />
          Add option
        </Button>

        <details className="rounded-2xl border border-border bg-surface p-4">
          <summary className="cursor-pointer font-semibold">Meal state (what would be saved)</summary>
          <pre className="mt-3 max-h-96 overflow-auto text-xs">{JSON.stringify(meal, null, 2)}</pre>
        </details>
      </main>

      {picking && (
        <EditDialog
          title="Add food"
          dirty={false}
          onClose={() => setPicking(null)}
        >
          <FoodList
            kinds={['food', 'supplement']}
            onPick={(food) => {
              const item = newItem(food);
              setMeal({
                ...meal,
                options: meal.options.map((row) => (row.id === picking ? {...row, items: [...row.items, item]} : row)),
              });
              setPicking(null);
              // The closing dialog returns focus to "Add food" first; then the new amount takes it.
              setTimeout(() => document.getElementById(`amount-${item.id}`)?.focus(), 50);
            }}
          />
        </EditDialog>
      )}

      {leaving && (
        <EditDialog
          title={newOn ? 'Discard this new meal?' : `Discard changes to ${initial.name}?`}
          dirty={false}
          onClose={() => setLeaving(false)}
          footer={
            <>
              <Button
                variant="ghost"
                onPress={() => setLeaving(false)}
              >
                Keep editing
              </Button>
              <Button
                variant="destructive"
                onPress={() => {
                  setLeaving(false);
                  if (newOn) {
                    onClose();
                  } else {
                    setMeal(initial);
                    setAttempted(false);
                  }
                }}
              >
                Discard changes
              </Button>
            </>
          }
        >
          <p>{newOn ? 'The meal is not added to any day.' : 'The meal stays as it was before you opened it.'}</p>
        </EditDialog>
      )}

      <UndoToast
        undo={undo}
        onExpire={clearUndo}
        onUndo={(before) => {
          setMeal(before);
          setUndo(null);
        }}
      />
    </div>
  );
}

function OptionCard({
  option,
  number,
  single,
  focusId,
  problem,
  onChange,
  onAddFood,
  onRemoveItem,
  onRemove,
}: {
  option: Option;
  number: number;
  single: boolean;
  focusId: string | null;
  problem: string | undefined;
  onChange: (option: Option) => void;
  onAddFood: () => void;
  onRemoveItem: (item: Item) => void;
  onRemove: () => void;
}) {
  const fallback = option.items.map((item) => foodOf(item.foodId)?.name).join(', ');
  return (
    <section
      aria-label={`Option ${number}`}
      className={cn('rounded-2xl border border-border bg-surface', problem && 'border-destructive')}
    >
      <label className="grid gap-1 px-4 pt-3">
        <span className="text-sm font-medium text-muted-foreground">
          {single ? 'Name shown to the client (optional)' : `Option ${number} name (optional)`}
        </span>
        <input
          value={option.name}
          placeholder={fallback || 'Oats bowl'}
          // biome-ignore lint/a11y/noAutofocus: a new option is named first
          autoFocus={focusId === option.id}
          onChange={(event) => onChange({...option, name: event.target.value})}
          className={cn(fieldClass, 'text-lg font-semibold placeholder:font-normal placeholder:text-muted-foreground')}
        />
      </label>
      {option.items.length === 0 ? (
        <p className="px-4 pt-3 text-muted-foreground">No foods yet. Add the first food of this option.</p>
      ) : (
        <ul className="space-y-1 px-2 pt-2">
          {option.items.map((item) => {
            const food = foodOf(item.foodId);
            return (
              <li
                key={item.id}
                className="grid grid-cols-[1fr_auto] items-start gap-x-2 gap-y-1 rounded-xl px-2 py-2 sm:grid-cols-[1fr_auto_auto]"
              >
                <p className="min-w-0 pt-2.5 font-semibold">
                  {food?.name}
                  {food?.kind === 'supplement' && (
                    <span className="ml-2 rounded-md bg-muted px-1.5 py-0.5 text-sm font-medium text-muted-foreground">
                      supplement
                    </span>
                  )}
                </p>
                <div className="col-span-2 row-start-2 sm:col-span-1 sm:row-start-1 sm:col-start-2">
                  <AmountFields
                    item={item}
                    onChange={(next) =>
                      onChange({...option, items: option.items.map((row) => (row.id === next.id ? next : row))})
                    }
                  />
                </div>
                <Button
                  size="icon-xs"
                  variant="ghost"
                  aria-label={`Remove ${food?.name}`}
                  className="col-start-2 row-start-1 text-muted-foreground sm:col-start-3"
                  onPress={() => onRemoveItem(item)}
                >
                  <X />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      {problem && (
        <p
          id={`problem-${option.id}`}
          className={cn(errorClass, 'px-4 pt-2')}
        >
          {problem}
        </p>
      )}
      <footer className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border px-4 pt-2 pb-3">
        <Button
          size="sm"
          variant="ghost"
          data-problem={problem ? true : undefined}
          {...(problem && {'aria-describedby': `problem-${option.id}`})}
          onPress={onAddFood}
        >
          <Plus />
          Add food
        </Button>
        {!single && (
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground"
            onPress={onRemove}
          >
            Remove option
          </Button>
        )}
        <p className="ml-auto text-sm font-semibold tabular-nums">Total: {totalLine(option.items)}</p>
      </footer>
    </section>
  );
}

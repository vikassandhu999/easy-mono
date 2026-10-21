import {ArrowLeft, Check, Plus, X} from 'lucide-react';
import {useCallback, useMemo, useRef, useState} from 'react';
import {useAddNutritionSchedule, useSaveNutritionPreset} from '../api/nutrition-week';
import {Button} from '../ui/button';
import {cn} from '../ui/cn';
import {Input} from '../ui/input';
import {Textarea} from '../ui/textarea';
import {
  type Day,
  daysLabel,
  discardMealDraft,
  type Item,
  type Meal,
  type MealDraft,
  mealBody,
  mealProblems,
  newItem,
  newOption,
  type Option,
  removeMealItem,
  removeMealOption,
  type State,
  totalLine,
  undoMealRemoval,
  usesOf,
} from './model';
import {
  AmountFields,
  type Commit,
  EditDialog,
  errorClass,
  FoodList,
  fieldClass,
  SaveRecovery,
  TimeField,
  UndoToast,
  useDraftGuard,
} from './parts';
import {useSaveRecovery} from './save-recovery';

export function MealEditor({
  clientId,
  clientName,
  commit,
  state,
  initial,
  newOn,
  onClose,
}: {
  clientId: string;
  clientName: string;
  commit: Commit;
  state: State;
  initial: Meal;
  newOn: Day | null; // a new meal is added to this day when saved
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(() => discardMealDraft(initial));
  const meal = draft.meal;
  const setMeal = (meal: Meal) => setDraft((current) => ({...current, meal}));
  const [time, setTime] = useState('');
  const [leaving, setLeaving] = useState<'reset' | 'close' | null>(null);
  const saveMeal = useSaveNutritionPreset(clientId);
  const addMeal = useAddNutritionSchedule(clientId);
  const recovery = useSaveRecovery(clientId, onClose, () => setLeaving('close'));
  const pending = saveMeal.isPending || addMeal.isPending || recovery.checking;
  const errorRef = useRef<HTMLDivElement>(null);
  const [picking, setPicking] = useState<string | null>(null); // option id
  const [focusId, setFocusId] = useState<string | null>(null); // the option that was just added
  const [attempted, setAttempted] = useState(false);
  const [removalMessage, setRemovalMessage] = useState('');
  const undo = useMemo(
    () => (draft.removal ? {message: removalMessage, before: draft.removal} : null),
    [draft.removal, removalMessage],
  );
  const clearUndo = useCallback(() => setDraft((current) => ({...current, removal: null})), []);
  const main = useRef<HTMLElement>(null);
  const [uses] = useState(() => (newOn ? [] : usesOf(state, initial.id)));
  const days = uses.reduce((mask, use) => mask | (use.weekdays_mask ?? 0), 0);
  const dirty = JSON.stringify(meal) !== JSON.stringify(initial) || Boolean(newOn && time);
  useDraftGuard(dirty, pending || recovery.uncertain);
  const problems = attempted ? mealProblems(meal) : [];
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
  const remove = (message: string, next: MealDraft) => {
    setRemovalMessage(message);
    setDraft(next);
  };
  const save = async () => {
    if (pending || recovery.blocked) {
      return;
    }
    if (mealProblems(meal).length > 0) {
      setAttempted(true);
      requestAnimationFrame(() =>
        main.current?.querySelector<HTMLElement>('[aria-invalid="true"], [data-problem]')?.focus(),
      );
      return;
    }
    try {
      const body = mealBody(meal);
      recovery.begin(
        newOn
          ? {kind: 'add', before: state, body: {preset: body, weekdays_mask: newOn.bit, time: time || null}}
          : {kind: 'meal', before: state, id: initial.id, body},
      );
      const result = newOn
        ? await addMeal.mutateAsync({preset: body, weekdays_mask: newOn.bit, time: time || null})
        : await saveMeal.mutateAsync({id: initial.id, body});
      commit(result, newOn ? `${meal.name.trim()} added to ${newOn.long}.` : `${meal.name.trim()} saved.`);
      onClose();
    } catch (cause) {
      recovery.fail(cause, 'Could not save this meal. Your edits are still here. Try again.');
      requestAnimationFrame(() => errorRef.current?.focus());
    }
  };
  const leave = () => {
    if (!pending && !recovery.blocked) {
      if (dirty) {
        setLeaving('close');
      } else {
        onClose();
      }
    }
  };

  return (
    <div className="nutrition-meal-editor min-h-dvh bg-background pb-24">
      <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-2 px-4 py-2 sm:px-6">
          <Button
            variant="ghost"
            className="min-w-11 shrink-0 px-2 text-muted-foreground"
            aria-label={`Back to ${clientName}’s nutrition week`}
            isDisabled={pending || recovery.blocked}
            onPress={leave}
          >
            <ArrowLeft />
            {/* A phone shows the arrow only, so Discard and Save keep their full labels. */}
            <span className="hidden sm:inline">{clientName} · Nutrition week</span>
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
                  isDisabled={pending || recovery.blocked}
                  onPress={newOn ? leave : () => setLeaving('reset')}
                >
                  Discard
                </Button>
                <Button
                  size="sm"
                  isPending={pending}
                  isDisabled={recovery.blocked}
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
        <div
          ref={errorRef}
          tabIndex={-1}
        >
          <SaveRecovery recovery={recovery} />
        </div>
        <fieldset
          disabled={pending || recovery.blocked}
          className="min-w-0 space-y-6"
        >
          <div className="space-y-2">
            <label
              htmlFor="meal-name"
              className="grid gap-1"
            >
              <span className="text-sm font-medium text-muted-foreground">Meal name</span>
              <Input
                id="meal-name"
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
                ? `New meal for ${newOn.long}. Choose its time below.`
                : uses.length === 0
                  ? 'Not on any day.'
                  : `On ${uses.map((use) => `${daysLabel(use.weekdays_mask ?? 0)} at ${use.time?.slice(0, 5) ?? 'any time'}`).join(', ')}. Saving changes all of these from today.`}
            </p>
          </div>

          <label
            htmlFor="meal-instructions"
            className="grid gap-1"
          >
            <span className="text-sm font-medium text-muted-foreground">Instructions for the client (optional)</span>
            <Textarea
              id="meal-instructions"
              rows={2}
              value={meal.instructions}
              onChange={(event) => setMeal({...meal, instructions: event.target.value})}
              className={cn(fieldClass, 'h-auto w-full py-2 leading-relaxed')}
            />
          </label>

          {newOn && (
            <TimeField
              time={time}
              onChange={setTime}
            />
          )}

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
                onRemoveItem={(item) => remove(`${item.food.name} removed.`, removeMealItem(meal, option.id, item.id))}
                onRemove={() => remove(`Option ${index + 1} removed.`, removeMealOption(meal, option.id))}
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
        </fieldset>
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
          title={
            recovery.conflict
              ? 'Discard this meal draft?'
              : newOn
                ? 'Discard this new meal?'
                : `Discard changes to ${initial.name}?`
          }
          dirty={false}
          onClose={() => setLeaving(null)}
          footer={
            <>
              <Button
                variant="ghost"
                onPress={() => setLeaving(null)}
              >
                Keep editing
              </Button>
              <Button
                variant="destructive"
                onPress={() => {
                  setLeaving(null);
                  if (leaving === 'close') {
                    onClose();
                  } else {
                    setDraft(discardMealDraft(initial));
                    setRemovalMessage('');
                    setAttempted(false);
                    recovery.clear();
                  }
                }}
              >
                Discard changes
              </Button>
            </>
          }
        >
          <p>
            {leaving === 'close'
              ? 'Your unsaved edits will be discarded. The saved week will be shown.'
              : 'The meal stays as it was before you opened it.'}
          </p>
        </EditDialog>
      )}

      <UndoToast
        undo={undo}
        pending={pending || recovery.blocked}
        onExpire={clearUndo}
        onUndo={() => setDraft(undoMealRemoval)}
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
  const fallback = option.items.map((item) => item.food.name).join(', ');
  return (
    <section
      aria-label={`Option ${number}`}
      className={cn('rounded-2xl border border-border bg-surface', problem && 'border-destructive')}
    >
      <label
        htmlFor={`option-name-${option.id}`}
        className="grid gap-1 px-4 pt-3"
      >
        <span className="text-sm font-medium text-muted-foreground">
          {single ? 'Name shown to the client (optional)' : `Option ${number} name (optional)`}
        </span>
        <Input
          id={`option-name-${option.id}`}
          value={option.name}
          placeholder={fallback || 'Oats bowl'}
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
            const food = item.food;
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

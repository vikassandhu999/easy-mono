import {ArrowLeftRight, Plus, Trash2, Utensils} from 'lucide-react';
import {useEffect, useRef, useState} from 'react';
import {useForm} from 'react-hook-form';
import {useNavigate, useParams} from 'react-router-dom';
import {ApiError, errorMessage} from '../api/client';
import {
  type Day,
  type DaySlotInput,
  MealConflict,
  type NutritionDayOption,
  type NutritionDaySlot,
  useNutritionDay,
  useSaveMeal,
} from '../api/nutrition';
import {getSession} from '../api/session';
import {routes} from '../routes';
import {dayLabel} from '../training/recording';
import {Button} from '../ui/button';
import {CachedRead} from '../ui/cached-read';
import {Confirm} from '../ui/confirm';
import {useOnline} from '../ui/connection-status';
import {DraftStatus} from '../ui/draft-status';
import {FormError} from '../ui/form-error';
import {FormField} from '../ui/form-field';
import {Page} from '../ui/page';
import {ReadState} from '../ui/read-state';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';
import {FoodPicker} from './library';
import {
  chooseAlternative,
  initialMealDraft,
  isMealSlot,
  type MealEntry,
  type MealSlot,
  mealInput,
  portionAmount,
  portionText,
  slotLabel,
} from './meal-draft';
import {useMealDraft} from './use-meal-draft';

export function NutritionMeal() {
  const {date = '', slot = ''} = useParams();
  const query = useNutritionDay(date);
  const day = query.data?.data;
  return (
    <Page
      title={isMealSlot(slot) ? slotLabel(slot) : 'Meal'}
      description={date ? dayLabel(date) : undefined}
      back={`${routes.nutrition}?date=${date}`}
      compact
    >
      {!isMealSlot(slot) ? (
        <p role="alert">This meal time is not available.</p>
      ) : !day ? (
        <ReadState
          label="your meal"
          failed={query.isError}
          retry={() => {
            query.refetch();
          }}
        />
      ) : (
        <>
          <CachedRead
            updatedAt={query.dataUpdatedAt}
            failed={query.isError}
            refreshing={query.isFetching}
            refresh={() => query.refetch()}
          />
          <MealEditor
            key={`${getSession()?.id}.${date}.${slot}`}
            day={day}
            slot={slot}
            fresh={query.isFetchedAfterMount && !query.isError && !query.isFetching}
          />
        </>
      )}
    </Page>
  );
}

function MealEditor({day, slot, fresh}: {day: Day; slot: MealSlot; fresh: boolean}) {
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const saved = day.slots.find((item) => item.meal_slot === slot);
  const controller = useMealDraft(initialMealDraft(day.date, slot, saved));
  const {draft, update} = controller;
  const save = useSaveMeal(day.date);
  const navigate = useNavigate();
  const online = useOnline();
  const [error, setError] = useState('');
  const [picker, setPicker] = useState<string | null>(null);
  const [alternative, setAlternative] = useState<NutritionDayOption | null>(null);
  const [discard, setDiscard] = useState(false);
  const [rebase, setRebase] = useState(false);
  const [saving, setSaving] = useState(false);
  const eligible = saved?.write_eligible ?? day.write_eligible;
  if (controller.loadError) {
    return (
      <div className="space-y-4">
        <FormError message={controller.loadError} />
        <DraftStatus state={controller.state} />
        {saved && <SavedMeal slot={saved} />}
        <Button
          variant="outline"
          onPress={() => setDiscard(true)}
        >
          Discard unreadable draft
        </Button>
        {discard && (
          <Confirm
            title="Discard unreadable draft?"
            action="Use saved meal"
            pending={controller.state === 'saving'}
            onClose={() => setDiscard(false)}
            onConfirm={async () => {
              if (await update(() => initialMealDraft(day.date, slot, saved), true)) {
                setDiscard(false);
              }
            }}
          >
            <p>This removes the local draft. Your saved intake stays unchanged.</p>
          </Confirm>
        )}
      </div>
    );
  }
  if (!draft) {
    return <p role="status">Opening your meal draft…</p>;
  }
  const conflict = draft.revision !== (saved?.revision ?? 0);
  const locked = saving || Boolean(draft.attempt) || !eligible || conflict;
  const canSave = online && fresh && !saving;
  const selected = saved?.options.find((option) => option.meal_id === draft.mealId);
  async function submit() {
    if (!draft) {
      return;
    }
    setError('');
    let input: DaySlotInput;
    try {
      input = draft.attempt ?? mealInput(draft);
    } catch (validation) {
      setError(validation instanceof Error ? validation.message : 'Review the meal portions before saving.');
      return;
    }
    setSaving(true);
    try {
      if (!(await update((current) => ({...current, attempt: input}), true))) {
        setError('Your meal could not be kept safely on this device. No save was sent. Please try again.');
        return;
      }
      const result = await save.mutateAsync(input);
      const resultSlot = result.data.slots.find((item) => item.meal_slot === slot);
      if (await update(() => initialMealDraft(day.date, slot, resultSlot), true)) {
        if (mounted.current) {
          await navigate(`${routes.nutrition}?date=${day.date}&saved=${slot}`);
        }
      } else {
        setError(
          'Your meal was saved, but this device could not clear the pending draft. Check the save again before editing.',
        );
      }
    } catch (caught) {
      if (caught instanceof ApiError && caught.status >= 400 && caught.status < 500 && caught.status !== 409) {
        await update((current) => ({...current, attempt: null}), true);
      }
      setError(
        caught instanceof MealConflict
          ? caught.message
          : errorMessage(
              caught,
              'The save could not be confirmed. Your draft is kept unchanged. Check the save when connected.',
            ),
      );
    } finally {
      setSaving(false);
    }
  }
  const foodPicker =
    picker !== null && !locked ? (
      <FoodPicker
        onClose={() => setPicker(null)}
        onPick={(kind, item, portion) => {
          update((current) => {
            const existing = current.entries.find((entry) => entry.input.id === picker);
            const entry: MealEntry = {
              name: item.name,
              amount: portionAmount(portion),
              included: true,
              input: {
                id: existing?.input.id ?? crypto.randomUUID(),
                planned_item_ref: existing?.input.planned_item_ref ?? null,
                food_id: kind === 'food' ? item.id : null,
                recipe_id: kind === 'recipe' ? item.id : null,
                portion,
                notes: existing?.input.notes ?? null,
              },
            };
            return {
              ...current,
              entries: existing
                ? current.entries.map((row) => (row.input.id === existing.input.id ? entry : row))
                : [...current.entries, entry],
            };
          });
          setPicker(null);
        }}
      />
    ) : null;
  return (
    <div className="space-y-5">
      {foodPicker}
      {!eligible && (
        <p
          role="status"
          className="text-muted-foreground"
        >
          This meal is read-only. Any unsaved draft is kept below.
        </p>
      )}
      {saved && saved.revision > 0 && (
        <details>
          <summary className="min-h-12 py-3 cursor-pointer font-semibold">View saved meal</summary>
          <SavedMeal slot={saved} />
        </details>
      )}
      {conflict && (
        <section className="space-y-3 border-l-4 border-primary pl-4">
          <h2 className="text-xl font-semibold">Meal changed</h2>
          <p>The saved meal has changed since this draft began. Compare it before deciding what to keep.</p>
          {saved && <SavedMeal slot={saved} />}
          <Button
            variant="outline"
            isDisabled={!canSave}
            onPress={() => setDiscard(true)}
          >
            Use saved meal
          </Button>
          {eligible && (
            <Button
              variant="outline"
              isDisabled={!canSave}
              onPress={() => setRebase(true)}
            >
              Review my draft instead
            </Button>
          )}
        </section>
      )}
      {draft.attempt && (
        <p
          role="status"
          className="text-sm text-muted-foreground"
        >
          This save is awaiting confirmation. The draft is kept unchanged. Check the save before making more changes.
        </p>
      )}
      <DraftStatus state={controller.state} />
      {selected?.meal_name && (!saved || saved.options.length < 2) && (
        <div className="flex items-start gap-3 rounded-3xl bg-[var(--nutrition)] p-5">
          <Utensils
            className="size-6 shrink-0 text-primary mt-1"
            aria-hidden="true"
          />
          <h2 className="text-xl font-bold">{selected.meal_name}</h2>
        </div>
      )}
      {saved && saved.options.length > 1 && (
        <div className="rounded-3xl bg-[var(--nutrition)] p-5 space-y-3">
          <h2 className="flex items-center gap-2 font-bold">
            <Utensils
              className="size-5 text-primary"
              aria-hidden="true"
            />{' '}
            Your meal
          </h2>
          <SelectField
            aria-label="Meal alternative"
            value={draft.mealId ?? ''}
            isDisabled={locked}
            onChange={(value) => {
              const option = saved.options.find((item) => item.meal_id === value);
              if (option && option.meal_id !== draft.mealId) {
                setAlternative(option);
              }
            }}
          >
            {saved.options.map((option) => (
              <SelectItem
                key={option.meal_id ?? ''}
                id={option.meal_id ?? ''}
              >
                {option.meal_name ?? 'Meal'}
              </SelectItem>
            ))}
          </SelectField>
        </div>
      )}
      {draft.entries.length === 0 && <p className="text-muted-foreground">Add a food or recipe to record this meal.</p>}
      {draft.entries.some((entry) => !entry.included) && (
        <Button
          variant="outline"
          className="w-full"
          isDisabled={locked}
          onPress={() =>
            update((current) => ({...current, entries: current.entries.map((entry) => ({...entry, included: true}))}))
          }
        >
          Record all listed items
        </Button>
      )}
      <ul className="space-y-4">
        {draft.entries.map((entry) => (
          <li
            key={entry.input.id}
            className="rounded-3xl bg-surface p-5 space-y-3"
          >
            <div className="flex justify-between items-start gap-3">
              <h3 className="text-lg font-bold min-w-0 flex-1">{entry.name}</h3>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={entry.included ? 'Remove from intake' : 'Record item'}
                isDisabled={locked}
                onPress={() =>
                  update((current) => ({
                    ...current,
                    entries: current.entries.map((row) =>
                      row.input.id === entry.input.id ? {...row, included: !row.included} : row,
                    ),
                  }))
                }
              >
                {entry.included ? (
                  <Trash2
                    className="size-4"
                    aria-hidden="true"
                  />
                ) : (
                  <Plus
                    className="size-5"
                    aria-hidden="true"
                  />
                )}
              </Button>
            </div>
            {entry.included ? (
              <EntryFields
                key={`${entry.input.id}.${entry.input.food_id}.${entry.input.recipe_id}.${draft.revision}`}
                entry={entry}
                locked={locked}
                onChange={(amount, notes) => {
                  update((current) => ({
                    ...current,
                    entries: current.entries.map((row) =>
                      row.input.id === entry.input.id
                        ? {...row, amount, input: {...row.input, notes: notes || null}}
                        : row,
                    ),
                  }));
                }}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Not recorded · {portionText(entry.input.portion)}</p>
            )}
            <Button
              variant="ghost"
              aria-label={`Replace ${entry.name}`}
              className="px-2 text-sm"
              isDisabled={locked}
              onPress={() => setPicker(entry.input.id)}
            >
              <ArrowLeftRight
                className="size-4"
                aria-hidden="true"
              />{' '}
              Replace item
            </Button>
          </li>
        ))}
      </ul>
      <Button
        variant="outline"
        className="w-full"
        isDisabled={locked}
        onPress={() => setPicker('new')}
      >
        <Plus
          className="size-5"
          aria-hidden="true"
        />
        Add food or recipe
      </Button>
      <FormError message={error} />
      {!online && (
        <p
          role="status"
          className="text-sm text-muted-foreground"
        >
          Reconnect to save. Your draft stays on this device.
        </p>
      )}
      {(eligible || draft.attempt) && (
        <div className="mobile-save-bar">
          <Button
            className="w-full"
            preventFocusOnPress
            isPending={save.isPending}
            isDisabled={!canSave || (conflict && !draft.attempt)}
            onPress={submit}
          >
            {draft.attempt ? 'Check meal save' : 'Save meal'}
          </Button>
        </div>
      )}
      <Button
        variant="ghost"
        isDisabled={save.isPending}
        onPress={() => setDiscard(true)}
      >
        Discard local changes
      </Button>
      {alternative && (
        <Confirm
          title="Change meal alternative?"
          action="Change alternative"
          pending={false}
          onClose={() => setAlternative(null)}
          onConfirm={async () => {
            if (await update((current) => chooseAlternative(current, alternative), true)) {
              setAlternative(null);
            }
          }}
        >
          <p>
            This replaces the listed planned items and their draft portions. Extra foods you added stay in the draft.
            Your saved meal changes only when you save.
          </p>
        </Confirm>
      )}
      {discard && (
        <Confirm
          title="Use the saved meal?"
          action="Discard local changes"
          pending={false}
          onClose={() => setDiscard(false)}
          onConfirm={async () => {
            if (await update(() => initialMealDraft(day.date, slot, saved), true)) {
              setDiscard(false);
              setError('');
            }
          }}
        >
          <p>Your unsaved changes on this device will be removed. The saved meal will stay unchanged.</p>
        </Confirm>
      )}
      {rebase && (
        <Confirm
          title="Keep your draft for review?"
          action="Keep draft for review"
          pending={false}
          onClose={() => setRebase(false)}
          onConfirm={async () => {
            if (await update((current) => ({...current, revision: saved?.revision ?? 0, attempt: null}), true)) {
              setRebase(false);
              setError('');
            }
          }}
        >
          <p>
            Your draft will replace the saved intake when you next save. Review every item first; changes from the other
            save are not merged.
          </p>
        </Confirm>
      )}
    </div>
  );
}

function SavedMeal({slot}: {slot: NutritionDaySlot}) {
  const rows = slot.rows.filter((row) => row.entry_id !== null);
  return (
    <div className="py-3 space-y-3">
      <p className="font-medium">
        Saved intake{slot.logged_calories === null ? '' : ` · ${slot.logged_calories} kcal`}
      </p>
      {rows.length === 0 ? (
        <p className="text-muted-foreground">No intake recorded.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.id}>
              <p>
                {row.name} · {portionText(row.portion)}
              </p>
              {row.notes && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{row.notes}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EntryFields({
  entry,
  locked,
  onChange,
}: {
  entry: MealEntry;
  locked: boolean;
  onChange: (amount: string, notes: string) => void;
}) {
  const form = useForm({defaultValues: {amount: entry.amount, notes: entry.input.notes ?? ''}});
  useEffect(() => {
    const values = form.getValues();
    if (values.amount !== entry.amount || values.notes !== (entry.input.notes ?? '')) {
      form.reset({amount: entry.amount, notes: entry.input.notes ?? ''});
    }
  }, [form, entry.amount, entry.input.notes]);
  useEffect(() => {
    const subscription = form.watch((values) => {
      if (!locked) {
        onChange(values.amount ?? '', values.notes ?? '');
      }
    });
    return () => subscription.unsubscribe();
  }, [form, locked, onChange]);
  return (
    <div className="space-y-2">
      <div className="[&>div]:grid-cols-[1fr_7rem] [&_label]:self-center [&_input]:h-14 [&_input]:text-xl [&_input]:font-bold [&_input]:text-center">
        <FormField
          control={form.control}
          name="amount"
          label={`Portion (${entry.input.portion.kind === 'gram' ? 'g' : entry.input.portion.label || entry.input.portion.unit})`}
          inputMode="decimal"
          isDisabled={locked}
        />
      </div>
      <details>
        <summary className="min-h-11 py-3 cursor-pointer text-sm font-semibold">Add a note</summary>
        <FormField
          control={form.control}
          name="notes"
          label={`Notes for ${entry.name}`}
          multiline
          maxLength={5000}
          isDisabled={locked}
        />
      </details>
    </div>
  );
}

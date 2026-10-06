import {ArrowLeftRight, Plus, Trash2, Utensils} from 'lucide-react';
import {useEffect, useRef, useState} from 'react';
import {useNavigate, useParams, useSearchParams} from 'react-router-dom';
import {ApiError, errorMessage} from '../api/client';
import {
  type DiaryMeal,
  MealConflict,
  type MealInput,
  type NutritionDay,
  type NutritionMeal as PlannedMeal,
  useNutritionDay,
  useSaveMeal,
} from '../api/nutrition';
import {findSavedMeal, MealNameConflict} from '../api/nutrition-meals';
import {getSession} from '../api/session';
import {readTrackerPrompts} from '../api/trackers';
import {safeReturnTo} from '../auth/return-to';
import {routes} from '../routes';
import {dayLabel} from '../training/recording';
import {BottomSheet} from '../ui/bottom-sheet';
import {Button} from '../ui/button';
import {CachedRead} from '../ui/cached-read';
import {useCoaching} from '../ui/coaching';
import {Confirm} from '../ui/confirm';
import {useOnline} from '../ui/connection-status';
import {DraftStatus} from '../ui/draft-status';
import {FormError} from '../ui/form-error';
import {Page} from '../ui/page';
import {ReadState} from '../ui/read-state';
import {ReferenceNotice} from '../ui/reference-notice';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';
import {Textarea} from '../ui/textarea';
import {TrackerPrompts} from '../ui/tracker-prompts';
import {FoodPicker} from './library';
import {
  chooseAlternative,
  initialMealDraft,
  type MealEntry,
  mealInput,
  portionAmount,
  portionText,
  reviewMealDraft,
} from './meal-draft';
import {useMealDraft} from './use-meal-draft';

export function NutritionMeal() {
  const {canWrite} = useCoaching();
  const {date = '', slot = ''} = useParams();
  const [params] = useSearchParams();
  const back = params.has('returnTo') ? safeReturnTo(params.get('returnTo')) : `${routes.nutrition}?date=${date}`;
  const query = useNutritionDay(date);
  const day = query.data?.data;
  const planned = day?.slots.find((item) => item.id === slot);
  const saved = planned?.meal ?? day?.extra_meals.find((item) => item.id === slot || item.slot_id === slot);
  return (
    <Page
      title={planned?.name ?? saved?.name ?? 'Meal'}
      description={date ? dayLabel(date) : undefined}
      back={back}
      compact
    >
      {!day ? (
        <ReadState
          label="your meal"
          failed={query.isError}
          retry={() => {
            query.refetch();
          }}
        />
      ) : params.has('referenceId') && params.get('referenceId') !== saved?.id ? (
        <p role="status">
          The meal linked in this message is no longer available. The message and its saved preview are still available
          in your conversation.
        </p>
      ) : (
        <>
          <CachedRead
            updatedAt={query.dataUpdatedAt}
            failed={query.isError}
            refreshing={query.isFetching}
            refresh={() => query.refetch()}
          />
          {saved && (
            <TrackerPrompts
              event={{about_meal_id: saved.id}}
              date={date}
            />
          )}
          {canWrite ? (
            <MealEditor
              key={`${getSession()?.id}.${date}.${slot}`}
              day={day}
              slot={slot}
              fresh={query.isFetchedAfterMount && !query.isError && !query.isFetching}
            />
          ) : saved ? (
            <>
              <ReferenceNotice revision={saved.revision} />
              <SavedMeal slot={saved} />
            </>
          ) : (
            <p>No intake recorded.</p>
          )}
        </>
      )}
    </Page>
  );
}

function MealEditor({day, slot, fresh}: {day: NutritionDay; slot: string; fresh: boolean}) {
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const planned = day.slots.find((item) => item.id === slot);
  const routeMeal = planned?.meal ?? day.extra_meals.find((item) => item.id === slot || item.slot_id === slot);
  const controller = useMealDraft(initialMealDraft(day.date, slot, routeMeal, planned));
  const {draft, update} = controller;
  const saved = draft ? findSavedMeal(day, {id: draft.id, slot_id: draft.slotId, name: draft.name.trim()}) : routeMeal;
  const save = useSaveMeal(day.date);
  const navigate = useNavigate();
  const online = useOnline();
  const [error, setError] = useState('');
  const [picker, setPicker] = useState<string | null>(null);
  const [quickAdd, setQuickAdd] = useState(false);
  const [alternative, setAlternative] = useState<PlannedMeal | null>(null);
  const [discard, setDiscard] = useState(false);
  const [rebase, setRebase] = useState(false);
  const [saving, setSaving] = useState(false);
  const eligible = day.write_eligible;
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
              if (await update(() => initialMealDraft(day.date, slot, saved, planned), true)) {
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
  const conflict = (saved && saved.id !== draft.id) || draft.revision !== (saved?.revision ?? 0);
  const locked = saving || Boolean(draft.attempt) || !eligible || conflict;
  const canSave = online && fresh && !saving;
  const selected = planned?.options.find((option) => option.id === draft.mealId);
  async function submit() {
    if (!draft) {
      return;
    }
    setError('');
    let input: MealInput;
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
      const resultSlot =
        result.data.slots.find((item) => item.id === slot)?.meal ??
        result.data.extra_meals.find((item) => item.id === draft.id);
      if (
        await update(() => initialMealDraft(day.date, slot, slot === 'new' ? undefined : resultSlot, planned), true)
      ) {
        if (mounted.current) {
          const prompts = resultSlot
            ? await readTrackerPrompts({about_meal_id: resultSlot.id}).catch(() => null)
            : null;
          if ((!prompts || prompts.data.length > 0) && resultSlot) {
            await navigate(`/nutrition/days/${day.date}/${resultSlot.slot_id ?? resultSlot.id}`);
          } else {
            await navigate(`${routes.nutrition}?date=${day.date}&saved=${slot}`);
          }
        }
      } else {
        setError(
          'Your meal was saved, but this device could not clear the pending draft. Check the save again before editing.',
        );
      }
    } catch (caught) {
      if (
        caught instanceof MealNameConflict ||
        (caught instanceof ApiError && caught.status >= 400 && caught.status < 500 && caught.status !== 409)
      ) {
        await update((current) => ({...current, attempt: null}), true);
      }
      setError(
        caught instanceof MealConflict || caught instanceof MealNameConflict
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
                request_id: crypto.randomUUID(),
                planned_item_id: existing?.input.planned_item_id ?? null,
                source: {type: kind, id: item.id},
                name: item.name,
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
      {saved && <ReferenceNotice revision={saved.revision} />}
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
      <div className="space-y-2">
        <label className="grid gap-2 font-semibold">
          Meal name
          <input
            aria-label="Meal name"
            aria-describedby="meal-name-help"
            className="h-12 rounded-xl border border-border px-3"
            value={draft.name}
            disabled={saving || Boolean(draft.attempt) || !eligible}
            onChange={(event) => {
              const name = event.target.value;
              update((current) => ({...current, name}));
            }}
          />
        </label>
        <p
          id="meal-name-help"
          className="text-sm text-muted-foreground"
        >
          This name identifies your recorded meal. It does not change the plan slot.
        </p>
      </div>
      {selected?.name && (!planned || planned.options.length < 2) && (
        <div className="flex items-start gap-3 rounded-3xl bg-[var(--nutrition)] p-5">
          <Utensils
            className="size-6 shrink-0 text-primary mt-1"
            aria-hidden="true"
          />
          <h2 className="text-xl font-bold">{selected.name}</h2>
        </div>
      )}
      {planned && planned.options.length > 1 && (
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
              const option = planned.options.find((item) => item.id === value);
              if (option && option.id !== draft.mealId) {
                setAlternative(option);
              }
            }}
          >
            {planned.options.map((option) => (
              <SelectItem
                key={option.id ?? ''}
                id={option.id ?? ''}
              >
                {option.name ?? 'Meal'}
              </SelectItem>
            ))}
          </SelectField>
        </div>
      )}
      {!draft.entries.some((entry) => entry.included) && (
        <p className="text-muted-foreground">
          {saved?.shared_at
            ? 'No foods in this correction. Sharing will remove the recorded intake for this meal. Earlier messages are kept.'
            : 'Add a food or recipe to record this meal.'}
        </p>
      )}
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
                key={`${entry.input.id}.${entry.input.source?.id}.${draft.revision}`}
                entry={entry}
                locked={locked}
                onChange={(amount) => {
                  update((current) => ({
                    ...current,
                    entries: current.entries.map((row) => (row.input.id === entry.input.id ? {...row, amount} : row)),
                  }));
                }}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Not recorded · {portionText(entry.input.portion)}</p>
            )}
            <label
              htmlFor={`notes-${entry.input.id}`}
              className="grid gap-2 text-sm"
            >
              Entry notes
              <Textarea
                id={`notes-${entry.input.id}`}
                aria-label={`Notes for ${entry.name}`}
                value={entry.input.notes ?? ''}
                disabled={locked}
                onChange={(event) => {
                  const notes = event.target.value;
                  update((current) => ({
                    ...current,
                    entries: current.entries.map((row) =>
                      row.input.id === entry.input.id ? {...row, input: {...row.input, notes}} : row,
                    ),
                  }));
                }}
              />
            </label>
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
      <Button
        variant="outline"
        className="w-full"
        isDisabled={locked}
        onPress={() => setQuickAdd(true)}
      >
        Quick add
      </Button>
      {quickAdd && !locked && (
        <QuickAdd
          onClose={() => setQuickAdd(false)}
          onAdd={(entry) => {
            update((current) => ({...current, entries: [...current.entries, entry]}));
            setQuickAdd(false);
          }}
        />
      )}
      <section className="rounded-3xl bg-surface p-5 space-y-3">
        <label
          htmlFor="meal-note-to-coach"
          className="font-semibold"
        >
          Note to coach
        </label>
        <Textarea
          id="meal-note-to-coach"
          value={draft.noteToCoach}
          maxLength={5000}
          disabled={locked}
          onChange={(event) => {
            const noteToCoach = event.target.value;
            update((current) => ({...current, noteToCoach}));
          }}
        />
        <p className="text-sm text-muted-foreground">Your coach can read this note with the saved meal.</p>
      </section>
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
            {draft.attempt ? 'Check meal save' : saved?.shared_at ? 'Save meal corrections' : 'Save meal'}
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
            if (await update(() => initialMealDraft(day.date, slot, saved, planned), true)) {
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
            if (
              await update(
                (current) =>
                  saved
                    ? reviewMealDraft(current, saved)
                    : {...current, revision: 0, requestId: crypto.randomUUID(), attempt: null},
                true,
              )
            ) {
              setRebase(false);
              setError('');
            }
          }}
        >
          <p>
            Your draft will replace the saved intake when you next save. Review every item first; changes from the other
            save are not merged. If the saved prescription differs, your draft foods become extra entries.
          </p>
        </Confirm>
      )}
    </div>
  );
}

function SavedMeal({slot}: {slot: DiaryMeal}) {
  return (
    <div className="space-y-3 py-3">
      <p className="font-semibold">Saved intake</p>
      {slot.note_to_coach && <p className="whitespace-pre-wrap">Note to coach: {slot.note_to_coach}</p>}
      {slot.entries.length === 0 ? (
        <p>No intake recorded.</p>
      ) : (
        <ul className="space-y-3">
          {slot.entries.map((entry) => (
            <li key={entry.id}>
              <p>
                {entry.name} · {portionText(entry.portion)}
              </p>
              {entry.notes && <p className="text-sm text-muted-foreground">{entry.notes}</p>}
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
  onChange: (amount: string) => void;
}) {
  return entry.input.portion ? (
    <label className="flex items-center justify-between gap-3 text-sm font-medium">
      Portion ({entry.input.portion.type === 'grams' ? 'g' : 'servings'})
      <input
        aria-label={`Portion for ${entry.name}`}
        className="h-12 w-28 rounded-xl border border-border px-3 text-base"
        inputMode="decimal"
        disabled={locked}
        value={entry.amount}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  ) : (
    <p className="text-sm text-muted-foreground">Quick add · {entry.input.nutrients?.energy_kcal ?? 'Unknown'} kcal</p>
  );
}

function QuickAdd({onClose, onAdd}: {onClose: () => void; onAdd: (entry: MealEntry) => void}) {
  const [error, setError] = useState('');
  return (
    <BottomSheet
      title="Quick add"
      onClose={onClose}
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const nutrients: NonNullable<MealEntry['input']['nutrients']> = {};
          for (const code of ['energy_kcal', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g', 'sugar_g']) {
            const value = String(data.get(code) ?? '').trim();
            if (value) {
              const amount = Number(value);
              if (!Number.isFinite(amount) || amount < 0) {
                setError('Enter zero or a positive number.');
                return;
              }
              nutrients[code] = amount;
            }
          }
          const name = String(data.get('name') ?? '').trim() || 'Quick add';
          onAdd({
            name,
            amount: '',
            included: true,
            input: {
              id: crypto.randomUUID(),
              request_id: crypto.randomUUID(),
              planned_item_id: null,
              source: null,
              portion: null,
              name,
              nutrients,
              notes: null,
            },
          });
        }}
      >
        <label className="grid gap-2">
          Name
          <input
            name="name"
            aria-label="Quick add name"
            className="h-12 rounded-xl border border-border px-3"
            defaultValue="Quick add"
          />
        </label>
        {[
          ['energy_kcal', 'Calories (kcal)'],
          ['protein_g', 'Protein (g)'],
          ['carbs_g', 'Carbs (g)'],
          ['fat_g', 'Fat (g)'],
          ['fiber_g', 'Fiber (g)'],
          ['sugar_g', 'Sugar (g)'],
        ].map(([code, label]) => (
          <label
            key={code}
            className="grid gap-2"
          >
            {label}
            <input
              name={code}
              aria-label={label}
              inputMode="decimal"
              required={code === 'energy_kcal'}
              className="h-12 rounded-xl border border-border px-3"
              placeholder={code === 'energy_kcal' ? 'Required' : 'Unknown'}
            />
          </label>
        ))}
        <p className="text-sm text-muted-foreground">Leave a value empty if it is unknown. Zero means a known zero.</p>
        <FormError message={error} />
        <Button
          type="submit"
          className="w-full"
        >
          Add quick entry
        </Button>
      </form>
    </BottomSheet>
  );
}

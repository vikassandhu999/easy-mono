/**
 * Nutrition Today (spec 01-today, option A) — the single date-navigable nutrition
 * screen: macro hero (consumed vs target, live) + meal slots logged into. No session.
 * A past date renders the same screen; future dates are read-only. Dark + periwinkle.
 */

import {addDays, formatDateISO, MEAL_SLOT_LABELS} from '@easy/utils';
import {Spinner, toast} from '@heroui/react';
import {Check, ChevronDown, ChevronLeft, ChevronRight, Plus} from 'lucide-react';
import {useEffect, useState} from 'react';
import {useNavigate, useSearchParams} from 'react-router-dom';
import {
  type NutritionDayOption,
  type NutritionDayRow,
  type NutritionDaySlot,
  useListClientNutritionDaysQuery,
  useSaveNutritionDayMutation,
} from '@/api/nutrition';
import type {DayEntryInput, DaySlotInput, NutritionPortion} from '@/api/schema';
import AmountSheet from '@/nutrition/amount-sheet';
import {diaryWriteError} from '@/nutrition/diary-write-error';
import FoodPicker, {type Picked} from '@/nutrition/food-picker';
import MacroHero from '@/nutrition/macro-hero';
import {ADHERENCE_TEXT, adherenceDisplay, dateLabel, dayTargets, kcalText} from '@/nutrition/nutrition-utils';
import OptionSheet from '@/nutrition/option-sheet';
import {ROUTES} from '@/routes';
import ErrorState from '@/ui/error-state';

const VERDICT_LABEL: Record<string, string> = {on: 'on target ✓', over: 'over target', under: 'under target'};

function Checkbox({on, disabled, onPress}: {disabled?: boolean; on: boolean; onPress: () => void}) {
  return (
    <button
      aria-label={on ? 'Mark not eaten' : 'Log as eaten'}
      className={`grid size-5 shrink-0 place-items-center rounded-md border transition-colors disabled:opacity-50 ${
        on ? 'border-success bg-success text-success-foreground' : 'border-field-border'
      }`}
      disabled={disabled}
      onClick={onPress}
      type="button"
    >
      {on ? <Check size={13} /> : null}
    </button>
  );
}

export default function NutritionToday() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const selectedDate = params.get('date');
  const todayQuery = useListClientNutritionDaysQuery();
  const selectedDayQuery = useListClientNutritionDaysQuery(selectedDate ? {date: selectedDate} : {}, {
    enabled: selectedDate != null,
  });
  const today = todayQuery.data?.data[0]?.date ?? formatDateISO(new Date());
  const date = selectedDate ?? today;
  const tomorrow = formatDateISO(addDays(today, 1));
  const isPast = date < today;

  const dayQuery = selectedDate ? selectedDayQuery : todayQuery;
  const {data: dayResp, isLoading: loadingDay, isError: dayError, refetch: refetchDay} = dayQuery;

  const saveDay = useSaveNutritionDayMutation();
  const busy = saveDay.isPending;
  const [editor, setEditor] = useState<
    | {kind: 'closed'}
    | {kind: 'amount'; slot: NutritionDaySlot; row: NutritionDayRow}
    | {kind: 'add'; slots: NutritionDaySlot[]}
    | {kind: 'replace'; slot: NutritionDaySlot; row: NutritionDayRow}
    | {kind: 'options'; slot: NutritionDaySlot}
    | {kind: 'confirmSwitch'; option: NutritionDayOption; slot: NutritionDaySlot}
  >({kind: 'closed'});
  const closeEditor = () => setEditor({kind: 'closed'});
  // biome-ignore lint/correctness/useExhaustiveDependencies: browser date navigation closes the active editor.
  useEffect(() => {
    setEditor({kind: 'closed'});
  }, [date]);

  const day = dayResp?.data[0] ?? null;
  const isEditable = day?.write_eligible === true;
  const slots = day?.slots ?? [];
  const logged = day?.summary.logged;
  const targets = dayTargets(day);

  const setDate = (d: string) => {
    closeEditor();
    setParams(d === today ? {} : {date: d}, {replace: true});
  };

  const reportError = (caught: unknown) =>
    toast.danger(diaryWriteError(caught, "Couldn't save it. Close and reopen to try again."));

  const toggleEntry = async (slot: NutritionDaySlot, row: NutritionDayRow) => {
    const draft = slotDraft(slot);
    draft.entries = row.entry_id
      ? draft.entries.filter((entry) => entry.id !== row.entry_id)
      : [...draft.entries, rowEntry(row)];
    try {
      await saveDay.mutateAsync({date, slots: [draft]});
    } catch (caught) {
      reportError(caught);
    }
  };

  const logWholeMeal = async (slot: NutritionDaySlot) => {
    try {
      await saveDay.mutateAsync({date, slots: [slotDraft(slot, true)]});
    } catch (caught) {
      reportError(caught);
    }
  };

  const onPick = async (picked: Picked) => {
    if (editor.kind !== 'add' && editor.kind !== 'replace') {
      return;
    }
    const replacing = editor.kind === 'replace' ? editor.row : null;
    const slot = editor.kind === 'replace' ? editor.slot : editor.slots.find((slot) => slot.meal_slot === picked.slot);
    const draft: DaySlotInput = slot
      ? slotDraft(slot)
      : {meal_slot: picked.slot, meal_id: null, expected_revision: 0, entries: []};
    const entry: DayEntryInput = {
      id: replacing?.entry_id ?? crypto.randomUUID(),
      planned_item_ref: replacing?.planned_item_ref ?? null,
      food_id: picked.kind === 'food' ? picked.id : null,
      recipe_id: picked.kind === 'recipe' ? picked.id : null,
      portion: picked.portion,
      notes: replacing?.notes ?? null,
    };
    draft.entries = [...draft.entries.filter((item) => item.id !== entry.id), entry];
    try {
      await saveDay.mutateAsync({date, slots: [draft]});
      closeEditor();
    } catch (caught) {
      reportError(caught);
    }
  };

  const saveAmount = async (portion: NutritionPortion, notes: string | null) => {
    if (editor.kind !== 'amount') {
      return;
    }
    const draft = slotDraft(editor.slot);
    const entry = {...rowEntry(editor.row), portion, notes};
    draft.entries = [...draft.entries.filter((item) => item.id !== entry.id), entry];
    await saveDay.mutateAsync({date, slots: [draft]});
    closeEditor();
  };

  const removeAmount = async () => {
    if (editor.kind !== 'amount') {
      return;
    }
    const draft = slotDraft(editor.slot);
    draft.entries = draft.entries.filter((entry) => entry.id !== editor.row.entry_id);
    await saveDay.mutateAsync({date, slots: [draft]});
    closeEditor();
  };

  const logWholeDay = async () => {
    try {
      await saveDay.mutateAsync({
        date,
        slots: slots.filter((slot) => slot.rows.some((row) => !row.entry_id)).map((slot) => slotDraft(slot, true)),
      });
    } catch (caught) {
      reportError(caught);
    }
  };

  const postSwitch = async (slot: NutritionDaySlot, option: NutritionDayOption) => {
    try {
      await saveDay.mutateAsync({date, slots: [{...slotDraft(slot), meal_id: option.meal_id}]});
      closeEditor();
    } catch (caught) {
      reportError(caught);
    }
  };

  const selectOption = async (slot: NutritionDaySlot, option: NutritionDayOption) => {
    closeEditor();
    const mealId = option.meal_id;
    if (!mealId || mealId === slot.meal_id) {
      return;
    }
    if (slot.rows.some((row) => row.planned_item_ref && row.entry_id)) {
      setEditor({kind: 'confirmSwitch', option, slot});
      return;
    }
    await postSwitch(slot, option);
  };

  const confirmSwitchOption = async () => {
    if (editor.kind !== 'confirmSwitch') {
      return;
    }
    await postSwitch(editor.slot, editor.option);
  };

  const anyUnlogged = slots.some((s) => s.rows.some((r) => !r.entry_id));
  const adh = adherenceDisplay(day);
  const verdict =
    isPast && adh !== 'none' && adh !== 'unknown' ? (
      <p
        className="mt-1.5 text-[11px] font-semibold"
        style={{color: ADHERENCE_TEXT[adh]}}
      >
        {VERDICT_LABEL[adh]}
      </p>
    ) : day && !day.write_eligible ? (
      <p className="mt-1.5 text-[11px] font-semibold text-white/50">
        {isPast ? 'Read-only' : 'Planned — read-only until the day starts'}
      </p>
    ) : undefined;

  if (loadingDay) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (dayError && !day) {
    return (
      <ErrorState
        message="Couldn't load your day."
        onRetry={refetchDay}
      />
    );
  }

  return (
    <div className="px-4 pb-10 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
      {dayError ? (
        <p
          role="alert"
          className="mb-3 text-sm text-danger"
        >
          Couldn't refresh your day. Your edits are still here.{' '}
          <button
            type="button"
            className="underline"
            onClick={() => refetchDay()}
          >
            Retry refresh
          </button>
        </p>
      ) : null}
      {/* Date navigator */}
      <div className="mb-3 flex items-center justify-between border-b border-border pb-3">
        <button
          aria-label="Previous day"
          className="grid size-8 place-items-center rounded-lg text-muted active:bg-surface-secondary"
          onClick={() => setDate(formatDateISO(addDays(date, -1)))}
          type="button"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="text-sm font-bold">{dateLabel(date, today)}</span>
        <button
          aria-label="Next day"
          className="grid size-8 place-items-center rounded-lg text-muted active:bg-surface-secondary disabled:opacity-30"
          disabled={date >= tomorrow}
          onClick={() => setDate(formatDateISO(addDays(date, 1)))}
          type="button"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <MacroHero
        consumed={logged ?? {}}
        statusLine={verdict}
        targets={targets}
      />

      {slots.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-6 text-center">
          <p className="text-sm font-medium">{day ? 'Nothing planned for this day' : 'Your plan is on the way'}</p>
          <p className="mt-1.5 text-xs text-muted">
            {day ? 'Log anything you ate off-plan below.' : 'Your coach is setting up your nutrition plan.'}
          </p>
        </div>
      ) : (
        slots.map((slot) => (
          <div
            className="mb-2.5 rounded-xl border border-border bg-surface p-3"
            key={slot.meal_slot}
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="text-xs font-semibold">{MEAL_SLOT_LABELS[slot.meal_slot]}</span>
                {slot.options.length > 1 ? (
                  <button
                    className="flex min-w-0 items-center gap-0.5 rounded-md px-1 py-0.5 text-[10px] font-medium text-accent active:opacity-70 disabled:opacity-50"
                    disabled={!slot.write_eligible || date !== today || busy}
                    onClick={() => setEditor({kind: 'options', slot})}
                    type="button"
                  >
                    <span className="max-w-24 truncate">
                      {slot.options.find((o) => o.meal_id === slot.meal_id)?.meal_name ?? 'Option'}
                    </span>
                    <span className="shrink-0 text-muted">· {slot.options.length - 1} more</span>
                    <ChevronDown
                      className="shrink-0"
                      size={11}
                    />
                  </button>
                ) : null}
              </div>
              {slot.rows.length > 0 && slot.rows.every((row) => row.entry_id) ? (
                <span className="text-[11px] text-accent">{kcalText(slot.logged_calories)} · ✓ logged</span>
              ) : slot.meal_id && slot.write_eligible ? (
                <button
                  className="text-[10px] font-medium text-accent active:opacity-70 disabled:opacity-50"
                  disabled={busy}
                  onClick={() => logWholeMeal(slot)}
                  type="button"
                >
                  ✓ log whole meal
                </button>
              ) : (
                <span className="text-[11px] text-muted">
                  {kcalText(slot.rows.some((row) => row.entry_id) ? slot.logged_calories : slot.planned_calories)}
                </span>
              )}
            </div>

            {slot.rows.map((row) => {
              const checked = row.entry_id != null;
              return (
                <div
                  className="flex items-center gap-2.5 border-t border-border py-1.5 text-xs"
                  key={row.id}
                >
                  <Checkbox
                    disabled={!slot.write_eligible || busy}
                    on={checked}
                    onPress={() => toggleEntry(slot, row)}
                  />
                  <button
                    className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left"
                    disabled={!slot.write_eligible || busy}
                    onClick={() => setEditor({kind: 'amount', slot, row})}
                    type="button"
                  >
                    <span className={`min-w-0 flex-1 truncate ${checked ? 'text-success-secondary' : ''}`}>
                      {row.name}
                      {row.status === 'swapped' ? (
                        <span className="ml-1.5 rounded border border-[#34506e] px-1 py-px text-[9px] text-accent">
                          replaced
                        </span>
                      ) : null}
                      {row.status === 'added' ? (
                        <span className="ml-1.5 rounded border border-[#7d5a2f] px-1 py-px text-[9px] text-warning">
                          off-plan
                        </span>
                      ) : null}
                      {row.status === 'recorded' ? (
                        <span className="ml-1.5 rounded border border-[#7d5a2f] px-1 py-px text-[9px] text-warning">
                          logged
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-[11px] text-muted">
                      {row.nutrients.calories != null ? Math.round(row.nutrients.calories) : '—'}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        ))
      )}

      {isEditable ? (
        <div className="mt-1 flex items-center justify-between gap-3">
          <button
            className="flex items-center gap-1.5 text-xs font-medium text-accent active:opacity-70"
            disabled={busy}
            onClick={() => setEditor({kind: 'add', slots})}
            type="button"
          >
            <Plus size={14} />
            Add food off-plan
          </button>
          {day && anyUnlogged && slots.every((slot) => slot.write_eligible) ? (
            <button
              className="text-xs font-medium text-muted active:opacity-70 disabled:opacity-50"
              disabled={busy}
              onClick={logWholeDay}
              type="button"
            >
              ✓ Log rest of day
            </button>
          ) : null}
        </div>
      ) : null}

      <button
        className="mt-4 flex min-h-11 w-full items-center justify-between rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-muted active:bg-surface-secondary"
        onClick={() => navigate(ROUTES.NUTRITION_HISTORY)}
        type="button"
      >
        <span>History &amp; trends</span>
        <ChevronRight size={16} />
      </button>

      {/* macro footnote */}
      <p className="mt-3 text-center text-[10px] text-muted">
        {kcalText(logged?.calories)} kcal logged
        {targets.calories != null && logged?.calories != null
          ? ` · ${Math.max(0, Math.round(targets.calories - logged.calories))} left`
          : ''}
      </p>

      {editor.kind === 'add' || editor.kind === 'replace' ? (
        <FoodPicker
          busy={busy}
          defaultSlot={editor.kind === 'replace' ? editor.slot.meal_slot : (slots[0]?.meal_slot ?? 'breakfast')}
          onClose={closeEditor}
          onPick={onPick}
          showSlotPicker={editor.kind === 'add'}
          title={editor.kind === 'replace' ? 'Replace with…' : 'Add food…'}
        />
      ) : null}

      {editor.kind === 'amount' ? (
        <AmountSheet
          onClose={closeEditor}
          onReplace={() => setEditor({...editor, kind: 'replace'})}
          busy={busy}
          onSave={saveAmount}
          onRemove={removeAmount}
          slot={editor.slot.meal_slot}
          row={editor.row}
        />
      ) : null}

      {editor.kind === 'options' ? (
        <OptionSheet
          activeMealId={editor.slot.meal_id}
          onClose={closeEditor}
          onSelect={(option) => selectOption(editor.slot, option)}
          options={editor.slot.options}
          slotLabel={MEAL_SLOT_LABELS[editor.slot.meal_slot]}
        />
      ) : null}

      {editor.kind === 'confirmSwitch' ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
          <button
            aria-label="Cancel meal option switch"
            className="absolute inset-0 cursor-default"
            onClick={() => closeEditor()}
            type="button"
          />
          <div
            aria-label="Confirm switch"
            aria-modal="true"
            className="relative z-10 w-full max-w-xs rounded-2xl border border-border bg-surface p-4"
            role="alertdialog"
          >
            <p className="mb-1 text-sm font-semibold">Switch option?</p>
            <p className="mb-4 text-xs text-muted">Logged items stay on the day. The other option becomes extras.</p>
            <div className="flex gap-2">
              <button
                className="flex-1 rounded-lg border border-border py-2 text-xs font-semibold text-muted active:bg-surface-secondary disabled:opacity-50"
                disabled={busy}
                onClick={() => closeEditor()}
                type="button"
              >
                Cancel
              </button>
              <button
                className="flex-1 rounded-lg bg-accent py-2 text-xs font-semibold text-accent-foreground active:opacity-90 disabled:opacity-50"
                disabled={busy}
                onClick={confirmSwitchOption}
                type="button"
              >
                Switch
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function rowEntry(row: NutritionDayRow): DayEntryInput {
  return {
    id: row.entry_id ?? crypto.randomUUID(),
    planned_item_ref: row.planned_item_ref,
    food_id: row.food_id,
    recipe_id: row.recipe_id,
    portion: row.portion,
    notes: row.notes,
  };
}

function slotDraft(slot: NutritionDaySlot, includePending = false): DaySlotInput {
  return {
    meal_slot: slot.meal_slot,
    meal_id: slot.meal_id,
    expected_revision: slot.revision,
    entries: slot.rows.filter((row) => includePending || row.entry_id).map(rowEntry),
  };
}

/**
 * Nutrition Today (spec 01-today, option A) — the single date-navigable nutrition
 * screen: macro hero (consumed vs target, live) + meal slots logged into. No session.
 * A past date renders the same screen; future dates are read-only. Dark + periwinkle.
 */

import {formatDateISO} from '@easy/utils';
import {toPortionInput} from '@easy/utils/nutrition-portion';
import {Spinner, toast} from '@heroui/react';
import {Check, ChevronDown, ChevronLeft, ChevronRight, Plus} from 'lucide-react';
import {useEffect, useRef, useState} from 'react';
import {useNavigate, useSearchParams} from 'react-router-dom';
import ErrorState from '@/@components/error-state';
import {ROUTES} from '@/@config/routes';
import {
  type NutritionDayOption,
  pickedToItemRef,
  toItemInput,
  useAddExtraMutation,
  useListClientNutritionDaysQuery,
  useLogPlannedDayMutation,
  useLogPlannedItemMutation,
  useLogPlannedOptionMutation,
  useReplaceItemMutation,
  useSwitchNutritionMealOptionMutation,
} from '@/api/nutrition';
import AmountSheet from '@/nutrition/components/amount-sheet';
import FoodPicker, {type Picked} from '@/nutrition/components/food-picker';
import MacroHero from '@/nutrition/components/macro-hero';
import OptionSheet from '@/nutrition/components/option-sheet';
import {
  beginDiaryCommand,
  completeDiaryCommand,
  type DiaryCommandIntents,
  extraIntentFingerprint,
  plannedDayIntentFingerprint,
  plannedItemIntentFingerprint,
  plannedOptionIntentFingerprint,
  replaceIntentFingerprint,
  switchOptionIntentFingerprint,
} from '@/nutrition/diary-command-key';
import {diaryWriteError} from '@/nutrition/diary-write-error';
import {
  ADHERENCE_TEXT,
  adherenceDisplay,
  dayTargets,
  kcalText,
  type SheetTarget,
  type SlotRow,
  type SlotView,
  sheetTargetFromRow,
  slotsFromDay,
} from '@/nutrition/nutrition-utils';

const VERDICT_LABEL: Record<string, string> = {on: 'on target ✓', over: 'over target', under: 'under target'};

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dateLabel(date: string, today: string): string {
  const d = new Date(`${date}T00:00:00`);
  const wd = d.toLocaleDateString('en-US', {weekday: 'short'});
  if (date === today) {
    return `Today · ${wd}`;
  }
  return `${wd} · ${d.toLocaleDateString('en-US', {day: 'numeric', month: 'short'})}`;
}

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
  const tomorrow = shiftDate(today, 1);
  const isPast = date < today;

  const dayQuery = selectedDate ? selectedDayQuery : todayQuery;
  const {data: dayResp, isLoading: loadingDay, isError: dayError, refetch: refetchDay} = dayQuery;

  const logOption = useLogPlannedOptionMutation();
  const logDay = useLogPlannedDayMutation();
  const switchOption = useSwitchNutritionMealOptionMutation();
  const {mutateAsync: logPlannedItem} = useLogPlannedItemMutation();
  const {mutateAsync: addExtra} = useAddExtraMutation();
  const {mutateAsync: replaceItem} = useReplaceItemMutation();
  const commandIntents = useRef<DiaryCommandIntents>(new Map());
  const loggingMeal = logOption.isPending;
  const loggingDay = logDay.isPending;
  const switchingOption = switchOption.isPending;
  const [sheet, setSheet] = useState<null | SheetTarget>(null);
  const [pickerMode, setPickerMode] = useState<'add' | 'replace' | null>(null);
  const [replaceTarget, setReplaceTarget] = useState<null | SheetTarget>(null);
  const [optionSheetSlot, setOptionSheetSlot] = useState<null | SlotView['slot']>(null);
  const [confirmSwitch, setConfirmSwitch] = useState<null | {option: NutritionDayOption; slot: SlotView}>(null);

  const day = dayResp?.data[0] ?? null;
  const isEditable = day?.write_eligible === true;
  const slots = slotsFromDay(day, isPast);
  const logged = day?.summary.logged;
  const targets = dayTargets(day);

  const setDate = (d: string) => setParams(d === today ? {} : {date: d}, {replace: true});

  // biome-ignore lint/correctness/useExhaustiveDependencies: date is the reset trigger, not read in the body
  useEffect(() => {
    commandIntents.current.clear();
  }, [date]);

  const logPlanned = async (slot: SlotView, row: SlotRow) => {
    if (row.status !== 'checklist') {
      return;
    }
    try {
      const intent = beginDiaryCommand(
        commandIntents.current,
        plannedItemIntentFingerprint({date, mealItemId: row.mealItemId, slot: slot.slot}),
      );
      await logPlannedItem({
        date,
        idempotencyKey: intent.key,
        meal_item_id: row.mealItemId,
        meal_slot: slot.slot,
      });
      completeDiaryCommand(commandIntents.current, intent);
    } catch (caught) {
      toast.danger(diaryWriteError(caught, "Couldn't log it. Try again."));
    }
  };

  const logWholeMeal = async (slot: SlotView) => {
    try {
      const intent = beginDiaryCommand(commandIntents.current, plannedOptionIntentFingerprint({date, slot: slot.slot}));
      await logOption.mutateAsync({
        date,
        idempotencyKey: intent.key,
        meal_slot: slot.slot,
      });
      completeDiaryCommand(commandIntents.current, intent);
    } catch (caught) {
      toast.danger(diaryWriteError(caught, "Couldn't log the meal. Try again."));
    }
  };

  const openSheet = (slot: SlotView, row: SlotRow) => setSheet(sheetTargetFromRow(date, slot, row));

  const onReplace = (t: SheetTarget) => {
    setSheet(null);
    setReplaceTarget(t);
    setPickerMode('replace');
  };

  const onPick = async (picked: Picked) => {
    const replacing = pickerMode === 'replace' ? replaceTarget : null;
    setPickerMode(null);
    setReplaceTarget(null);
    const item = toItemInput(pickedToItemRef(picked));
    const portion =
      picked.defaultWeightG != null
        ? toPortionInput({grams: picked.defaultWeightG, kind: 'gram'})
        : toPortionInput({amount: picked.defaultAmount ?? 1, kind: 'serving', label: null, unit: 'serving'});

    try {
      if (replacing?.mealItemId) {
        const expectedRevision = replacing.mode === 'logged' ? replacing.loggedEntry.revision : 1;
        const intent = beginDiaryCommand(
          commandIntents.current,
          replaceIntentFingerprint({
            date,
            expectedRevision,
            id: picked.id,
            kind: picked.kind,
            mealItemId: replacing.mealItemId,
            slot: replacing.slot,
            weight: picked.defaultWeightG,
          }),
        );
        await replaceItem({
          ...item,
          date,
          expected_revision: expectedRevision,
          idempotencyKey: intent.key,
          meal_item_id: replacing.mealItemId,
          meal_slot: replacing.slot,
          portion,
        });
        completeDiaryCommand(commandIntents.current, intent);
      } else {
        const intent = beginDiaryCommand(commandIntents.current, extraIntentFingerprint({...picked, date}));
        await addExtra({
          ...item,
          date,
          meal_slot: picked.slot,
          portion,
          idempotencyKey: intent.key,
        });
        completeDiaryCommand(commandIntents.current, intent);
      }
    } catch (caught) {
      toast.danger(diaryWriteError(caught, "Couldn't save it. Try again."));
    }
  };

  const logWholeDay = async () => {
    try {
      const intent = beginDiaryCommand(commandIntents.current, plannedDayIntentFingerprint({date}));
      await logDay.mutateAsync({date, idempotencyKey: intent.key});
      completeDiaryCommand(commandIntents.current, intent);
    } catch (caught) {
      toast.danger(diaryWriteError(caught, "Couldn't log the day. Try again."));
    }
  };

  const postSwitch = async (slot: SlotView, option: NutritionDayOption) => {
    if (!option.meal_id) {
      return;
    }
    try {
      const intent = beginDiaryCommand(
        commandIntents.current,
        switchOptionIntentFingerprint({
          date,
          expectedRevision: slot.revision,
          mealId: option.meal_id,
          slot: slot.slot,
        }),
      );
      await switchOption.mutateAsync({
        date,
        expected_revision: slot.revision,
        idempotencyKey: intent.key,
        meal_id: option.meal_id,
        meal_slot: slot.slot,
      });
      completeDiaryCommand(commandIntents.current, intent);
      setConfirmSwitch(null);
    } catch (caught) {
      toast.danger(diaryWriteError(caught, "Couldn't switch options. Try again."));
    }
  };

  const selectOption = async (slot: SlotView, option: NutritionDayOption) => {
    setOptionSheetSlot(null);
    const mealId = option.meal_id;
    if (!mealId || mealId === slot.activeMealId) {
      return;
    }
    if (slot.hasPlannedLog) {
      setConfirmSwitch({option, slot});
      return;
    }
    await postSwitch(slot, option);
  };

  const confirmSwitchOption = async () => {
    if (!confirmSwitch) {
      return;
    }
    await postSwitch(confirmSwitch.slot, confirmSwitch.option);
  };

  const anyUnlogged = slots.some((s) =>
    s.rows.some((r) => r.status === 'checklist' || r.status === 'pending' || r.status === 'skipped'),
  );
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
      <p className="mt-1.5 text-[11px] font-semibold text-white/50">Planned — read-only until the day starts</p>
    ) : undefined;

  if (loadingDay) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (dayError) {
    return (
      <ErrorState
        message="Couldn't load your day."
        onRetry={refetchDay}
      />
    );
  }

  return (
    <div className="px-4 pb-10 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
      {/* Date navigator */}
      <div className="mb-3 flex items-center justify-between border-b border-border pb-3">
        <button
          aria-label="Previous day"
          className="grid size-8 place-items-center rounded-lg text-muted active:bg-surface-secondary"
          onClick={() => setDate(shiftDate(date, -1))}
          type="button"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="text-sm font-bold">{dateLabel(date, today)}</span>
        <button
          aria-label="Next day"
          className="grid size-8 place-items-center rounded-lg text-muted active:bg-surface-secondary disabled:opacity-30"
          disabled={date >= tomorrow}
          onClick={() => setDate(shiftDate(date, 1))}
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
            key={slot.slot}
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="text-xs font-semibold">{slot.label}</span>
                {slot.options.length > 1 ? (
                  <button
                    className="flex min-w-0 items-center gap-0.5 rounded-md px-1 py-0.5 text-[10px] font-medium text-accent active:opacity-70 disabled:opacity-50"
                    disabled={!slot.writeEligible || date !== today}
                    onClick={() => setOptionSheetSlot(slot.slot)}
                    type="button"
                  >
                    <span className="max-w-24 truncate">
                      {slot.options.find((o) => o.meal_id === slot.activeMealId)?.meal_name ?? 'Option'}
                    </span>
                    <span className="shrink-0 text-muted">· {slot.options.length - 1} more</span>
                    <ChevronDown
                      className="shrink-0"
                      size={11}
                    />
                  </button>
                ) : null}
              </div>
              {slot.allPlannedLogged ? (
                <span className="text-[11px] text-accent">{kcalText(slot.loggedCalories)} · ✓ logged</span>
              ) : slot.mealId && slot.writeEligible ? (
                <button
                  className="text-[10px] font-medium text-accent active:opacity-70 disabled:opacity-50"
                  disabled={loggingMeal}
                  onClick={() => logWholeMeal(slot)}
                  type="button"
                >
                  ✓ log whole meal
                </button>
              ) : (
                <span className="text-[11px] text-muted">
                  {kcalText(slot.hasLog ? slot.loggedCalories : slot.plannedCalories)}
                </span>
              )}
            </div>

            {slot.rows.map((row, index) => {
              const extra = row.status === 'added' || row.status === 'recorded';
              const checked =
                row.status === 'as_planned' || row.status === 'swapped' || row.status === 'recorded' || extra;
              const key =
                row.status === 'added' || row.status === 'recorded'
                  ? row.entry.id
                  : row.status === 'checklist' ||
                      row.status === 'skipped' ||
                      row.status === 'pending' ||
                      row.status === 'as_planned' ||
                      row.status === 'swapped'
                    ? row.mealItemId
                    : `row-${index}`;
              return (
                <div
                  className="flex items-center gap-2.5 border-t border-border py-1.5 text-xs"
                  key={key}
                >
                  <Checkbox
                    disabled={!slot.writeEligible || extra}
                    on={checked}
                    onPress={() => {
                      if (row.status === 'checklist') {
                        logPlanned(slot, row);
                      }
                    }}
                  />
                  <button
                    className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left"
                    disabled={!slot.writeEligible}
                    onClick={() => openSheet(slot, row)}
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
                      {row.calories != null ? Math.round(row.calories) : '—'}
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
            onClick={() => setPickerMode('add')}
            type="button"
          >
            <Plus size={14} />
            Add food off-plan
          </button>
          {day && anyUnlogged && slots.every((slot) => slot.writeEligible) ? (
            <button
              className="text-xs font-medium text-muted active:opacity-70 disabled:opacity-50"
              disabled={loggingDay}
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

      {pickerMode ? (
        <FoodPicker
          defaultSlot={replaceTarget?.slot ?? slots[0]?.slot ?? 'breakfast'}
          onClose={() => {
            setPickerMode(null);
            setReplaceTarget(null);
          }}
          onPick={onPick}
          showSlotPicker={pickerMode === 'add'}
          title={pickerMode === 'replace' ? 'Replace with…' : 'Add food…'}
        />
      ) : null}

      {sheet ? (
        <AmountSheet
          onClose={() => setSheet(null)}
          onReplace={onReplace}
          target={sheet}
        />
      ) : null}

      {optionSheetSlot
        ? (() => {
            const slot = slots.find((s) => s.slot === optionSheetSlot);
            return slot ? (
              <OptionSheet
                activeMealId={slot.activeMealId}
                onClose={() => setOptionSheetSlot(null)}
                onSelect={(option) => selectOption(slot, option)}
                options={slot.options}
                slotLabel={slot.label}
              />
            ) : null;
          })()
        : null}

      {confirmSwitch ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
          <button
            aria-label="Cancel meal option switch"
            className="absolute inset-0 cursor-default"
            onClick={() => setConfirmSwitch(null)}
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
                disabled={switchingOption}
                onClick={() => setConfirmSwitch(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="flex-1 rounded-lg bg-accent py-2 text-xs font-semibold text-accent-foreground active:opacity-90 disabled:opacity-50"
                disabled={switchingOption}
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

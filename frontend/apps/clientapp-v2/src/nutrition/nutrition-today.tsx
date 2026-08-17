/**
 * Nutrition Today (spec 01-today, option A) — the single date-navigable nutrition
 * screen: macro hero (consumed vs target, live) + meal slots logged into. No session.
 * A past date renders the same screen; future dates are read-only. Dark + periwinkle.
 */

import {formatDateISO, formatMacroValue} from '@easy/utils';
import {Spinner, toast} from '@heroui/react';
import {Check, ChevronDown, ChevronLeft, ChevronRight, Plus} from 'lucide-react';
import {useEffect, useState} from 'react';
import {useNavigate, useSearchParams} from 'react-router-dom';
import ErrorState from '@/@components/error-state';

import {ROUTES} from '@/@config/routes';
import {
  type FoodLogEntry,
  type NutritionDayOption,
  type SwitchOptionRequest,
  useAddExtraMutation,
  useDeleteFoodLogEntryMutation,
  useListClientNutritionDaysQuery,
  useLogDayMutation,
  useLogMealMutation,
  useLogPlannedItemMutation,
  useReplaceItemMutation,
  useSwitchNutritionMealOptionMutation,
} from '@/api/nutrition';
import AmountSheet, {type SheetTarget} from '@/nutrition/components/amount-sheet';
import FoodPicker, {type Picked} from '@/nutrition/components/food-picker';
import MacroHero from '@/nutrition/components/macro-hero';
import OptionSheet from '@/nutrition/components/option-sheet';
import {
  ADHERENCE_TEXT,
  adherence,
  dayConsumed,
  dayTargets,
  type SlotRow,
  type SlotView,
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
  const today = formatDateISO(new Date());
  const date = params.get('date') ?? today;
  const tomorrow = shiftDate(today, 1);
  const isPast = date < today;

  const {
    data: dayResp,
    isLoading: loadingDay,
    isError: dayError,
    refetch: refetchDay,
  } = useListClientNutritionDaysQuery({date});

  const logMeal = useLogMealMutation();
  const logDay = useLogDayMutation();
  const switchOption = useSwitchNutritionMealOptionMutation();
  const {mutateAsync: logPlannedItem} = useLogPlannedItemMutation();
  const {mutateAsync: addExtra} = useAddExtraMutation();
  const {mutateAsync: replaceItem} = useReplaceItemMutation();
  const {mutateAsync: deleteEntry} = useDeleteFoodLogEntryMutation();
  const loggingMeal = logMeal.isPending;
  const loggingDay = logDay.isPending;
  const switchingOption = switchOption.isPending;
  const [sheet, setSheet] = useState<null | SheetTarget>(null);
  const [pickerMode, setPickerMode] = useState<'add' | 'replace' | null>(null);
  const [replaceTarget, setReplaceTarget] = useState<null | SheetTarget>(null);
  // local, unsaved option picks (slot → meal_id) — cleared once the server confirms a switch
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [optionSheetSlot, setOptionSheetSlot] = useState<null | string>(null);
  const [confirmSwitch, setConfirmSwitch] = useState<null | {option: NutritionDayOption; slot: SlotView}>(null);

  const day = dayResp?.data[0] ?? null;
  const isEditable = day?.write_eligible === true;
  const slots = slotsFromDay(day, selections, isPast);
  const consumed = dayConsumed(day);
  const targets = dayTargets(day);
  const loadingPlan = loadingDay;
  const loadingLogs = loadingDay;
  const logsError = dayError;
  const refetchPlan = refetchDay;
  const refetchLogs = refetchDay;
  const plan = day;

  const setDate = (d: string) => setParams(d === today ? {} : {date: d}, {replace: true});

  // A plan's meal_id recurs weekly, so an unsaved option pick must not survive a date change
  // (it would silently apply to the same slot on a different day).
  // biome-ignore lint/correctness/useExhaustiveDependencies: date is the reset trigger, not read in the body
  useEffect(() => {
    setSelections({});
  }, [date]);

  const logPlanned = async (slot: SlotView, row: SlotRow) => {
    if (!row.plannedItem || !row.mealItemId) {
      return;
    }
    try {
      await logPlannedItem({
        amount: row.plannedItem.portion.amount ?? undefined,
        date,
        meal_id: slot.mealId ?? undefined,
        meal_slot: slot.slot as SwitchOptionRequest['meal_slot'],
        planned_item_id: row.mealItemId,
        unit: row.plannedItem.portion.unit ?? undefined,
        weight_g: row.plannedItem.portion.grams ?? undefined,
      });
    } catch {
      toast.danger("Couldn't log it. Try again.");
    }
  };

  const removeEntry = async (entry: FoodLogEntry) => {
    try {
      await deleteEntry(entry.id);
    } catch {
      toast.danger("Couldn't remove it. Try again.");
    }
  };

  const logWholeMeal = async (slot: SlotView) => {
    if (!slot.mealId) {
      return;
    }
    try {
      await logMeal.mutateAsync({date, meal_id: slot.mealId, meal_slot: slot.slot as SwitchOptionRequest['meal_slot']});
    } catch {
      toast.danger("Couldn't log the meal. Try again.");
    }
  };

  const openSheet = (slot: SlotView, row: SlotRow) =>
    setSheet({
      date,
      loggedEntry: row.entry,
      mealId: slot.mealId,
      name: row.name,
      mealItemId: row.mealItemId,
      plannedItem: row.plannedItem,
      slot: slot.slot,
      slotLabel: slot.label,
    });

  const openExtraSheet = (slot: SlotView, entry: FoodLogEntry) =>
    setSheet({
      date,
      loggedEntry: entry,
      mealId: slot.mealId,
      name: entry.food_name ?? 'Food',
      mealItemId: null,
      plannedItem: null,
      slot: slot.slot,
      slotLabel: slot.label,
    });

  const onReplace = (t: SheetTarget) => {
    setSheet(null);
    setReplaceTarget(t);
    setPickerMode('replace');
  };

  const onPick = async (picked: Picked) => {
    const replacing = pickerMode === 'replace' ? replaceTarget : null;
    setPickerMode(null);
    setReplaceTarget(null);
    // A servings-sized recipe carries no grams; the server rejects weight_g for one.
    const portion =
      picked.defaultWeightG != null
        ? {weight_g: picked.defaultWeightG}
        : {amount: picked.defaultAmount ?? 1, unit: 'serving'};

    try {
      if (replacing?.mealItemId) {
        await replaceItem({
          date,
          food_id: picked.kind === 'food' ? picked.id : undefined,
          meal_id: replacing.mealId ?? undefined,
          meal_slot: replacing.slot as SwitchOptionRequest['meal_slot'],
          planned_item_id: replacing.mealItemId,
          recipe_id: picked.kind === 'recipe' ? picked.id : undefined,
          ...portion,
        });
      } else {
        const selectedSlot = slots.find((slot) => slot.slot === picked.slot);
        await addExtra({
          date,
          food_id: picked.kind === 'food' ? picked.id : undefined,
          meal_id: selectedSlot?.mealId ?? undefined,
          meal_slot: picked.slot as SwitchOptionRequest['meal_slot'],
          recipe_id: picked.kind === 'recipe' ? picked.id : undefined,
          ...portion,
        });
      }
    } catch {
      toast.danger("Couldn't save it. Try again.");
    }
  };

  const logWholeDay = async () => {
    if (!plan?.plan_id) {
      return;
    }
    try {
      await logDay.mutateAsync({date, plan_id: plan.plan_id});
    } catch {
      toast.danger("Couldn't log the day. Try again.");
    }
  };

  const selectOption = (slot: SlotView, option: NutritionDayOption) => {
    setOptionSheetSlot(null);
    if (option.meal_id === slot.activeMealId) {
      return;
    }
    if (!slot.hasPlannedLog) {
      setSelections((prev) => ({...prev, [slot.slot]: option.meal_id}));
      return;
    }
    setConfirmSwitch({option, slot});
  };

  const confirmSwitchOption = async () => {
    if (!confirmSwitch) {
      return;
    }
    const {option, slot} = confirmSwitch;
    try {
      await switchOption.mutateAsync({
        date,
        meal_id: option.meal_id,
        meal_slot: slot.slot as SwitchOptionRequest['meal_slot'],
      });
      setSelections((prev) => {
        const next = {...prev};
        delete next[slot.slot];
        return next;
      });
      setConfirmSwitch(null);
    } catch {
      toast.danger("Couldn't switch options. Try again.");
    }
  };

  const anyUnlogged = slots.some((s) => s.rows.some((r) => r.status === 'checklist' || r.status === 'skipped'));
  const adh = adherence(consumed.calories, targets.calories);
  const verdict =
    isPast && consumed.calories > 0 && targets.calories != null && adh !== 'none' ? (
      <p
        className="mt-1.5 text-[11px] font-semibold"
        style={{color: ADHERENCE_TEXT[adh]}}
      >
        {VERDICT_LABEL[adh]}
      </p>
    ) : day && !day.write_eligible ? (
      <p className="mt-1.5 text-[11px] font-semibold text-white/50">Planned — read-only until the day starts</p>
    ) : undefined;

  if (loadingPlan || loadingLogs) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (logsError) {
    return (
      <ErrorState
        message="Couldn't load your day."
        onRetry={() => {
          refetchLogs();
          refetchPlan();
        }}
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
        consumed={consumed}
        statusLine={verdict}
        targets={targets}
      />

      {slots.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-6 text-center">
          <p className="text-sm font-medium">{plan ? 'Nothing planned for this day' : 'Your plan is on the way'}</p>
          <p className="mt-1.5 text-xs text-muted">
            {plan ? 'Log anything you ate off-plan below.' : 'Your coach is setting up your nutrition plan.'}
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
                    disabled={!isEditable}
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
                <span className="text-[11px] text-accent">{Math.round(slot.loggedCalories)} · ✓ logged</span>
              ) : slot.mealId && isEditable ? (
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
                  {Math.round(slot.hasLog ? slot.loggedCalories : slot.plannedCalories)}
                </span>
              )}
            </div>

            {slot.rows.map((row, index) => {
              const checked = row.status === 'as_planned' || row.status === 'swapped' || row.status === 'added';
              const key = row.entry?.id ?? row.mealItemId ?? `row-${index}`;
              return (
                <div
                  className="flex items-center gap-2.5 border-t border-border py-1.5 text-xs"
                  key={key}
                >
                  <Checkbox
                    disabled={!isEditable}
                    on={checked}
                    onPress={() => (row.entry ? removeEntry(row.entry) : logPlanned(slot, row))}
                  />
                  <button
                    className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left"
                    disabled={!isEditable}
                    onClick={() =>
                      row.status === 'added' && row.entry ? openExtraSheet(slot, row.entry) : openSheet(slot, row)
                    }
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
          {plan && anyUnlogged ? (
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
        {formatMacroValue(consumed.calories, '')} kcal logged
        {targets.calories ? ` · ${Math.max(0, Math.round(targets.calories - consumed.calories))} left` : ''}
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
            <p className="mb-4 text-xs text-muted">Switching clears what you've logged for this meal</p>
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

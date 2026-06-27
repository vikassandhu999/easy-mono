/**
 * Nutrition Today (spec 01-today, option A) — the single date-navigable nutrition
 * screen: macro hero (consumed vs target, live) + meal slots logged into. No session.
 * A past date renders the same screen; future dates are read-only. Dark + periwinkle.
 */
import {formatMacroValue} from '@easy/utils';
import {Spinner, toast} from '@heroui/react';
import {Check, ChevronLeft, ChevronRight, Plus} from 'lucide-react';
import {useState} from 'react';
import {useNavigate, useSearchParams} from 'react-router-dom';

import {ROUTES} from '@/@config/routes';
import {
  asTodayPlan,
  type FoodLogEntry,
  plannedItemCalories,
  useCreateFoodLogEntryMutation,
  useDeleteFoodLogEntryMutation,
  useGetTodayNutritionPlanQuery,
  useListClientMealLogsQuery,
  useListClientNutritionPlansQuery,
  useLogDayMutation,
  useLogMealMutation,
} from '@/api/nutrition';
import AmountSheet, {type SheetTarget} from '@/nutrition/components/amount-sheet';
import FoodPicker, {type Picked} from '@/nutrition/components/food-picker';
import MacroHero from '@/nutrition/components/macro-hero';
import {
  adherence,
  buildSlots,
  dayTotals,
  type PlannedRow,
  planTargets,
  type SlotView,
} from '@/nutrition/nutrition-utils';

const VERDICT_LABEL: Record<string, string> = {on: 'on target ✓', over: 'over target', under: 'under target'};
const VERDICT_COLOR: Record<string, string> = {on: '#5fe08a', over: '#e08a86', under: '#e0a14d'};

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

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
        on ? 'border-success bg-success text-success-foreground' : 'border-[#444]'
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
  const today = localToday();
  const date = params.get('date') ?? today;
  const isFuture = date > today;

  const {data: todayResp, isLoading: loadingPlan, refetch: refetchPlan} = useGetTodayNutritionPlanQuery({date});
  const {
    data: logsResp,
    isLoading: loadingLogs,
    isError: logsError,
    refetch: refetchLogs,
  } = useListClientMealLogsQuery({date});
  const {data: plansResp} = useListClientNutritionPlansQuery({status: 'active'});

  const [createEntry] = useCreateFoodLogEntryMutation();
  const [deleteEntry] = useDeleteFoodLogEntryMutation();
  const [logMeal, {isLoading: loggingMeal}] = useLogMealMutation();
  const [logDay, {isLoading: loggingDay}] = useLogDayMutation();
  const [sheet, setSheet] = useState<null | SheetTarget>(null);
  const [pickerMode, setPickerMode] = useState<'add' | 'replace' | null>(null);
  const [replaceTarget, setReplaceTarget] = useState<null | SheetTarget>(null);

  const plan = asTodayPlan(todayResp);
  const mealLogs = logsResp?.data ?? [];
  const slots = buildSlots(plan, mealLogs);
  const consumed = dayTotals(mealLogs);
  const targets = planTargets(plansResp?.data[0]);

  const setDate = (d: string) => setParams(d === today ? {} : {date: d}, {replace: true});

  const logPlanned = async (slot: SlotView, row: PlannedRow) => {
    try {
      await createEntry({
        foodLogEntryRequest: {
          amount: row.item.amount,
          date,
          food_id: row.item.food_id ?? undefined,
          meal_id: slot.mealId ?? undefined,
          meal_slot: slot.slot,
          plan_id: plan?.plan_id,
          planned_item_index: row.position,
          recipe_id: row.item.recipe_id ?? undefined,
          source: 'planned',
          unit: row.item.unit,
          weight_g: row.item.weight_g,
        },
      }).unwrap();
    } catch {
      toast.danger("Couldn't log it. Try again.");
    }
  };

  const removeEntry = async (entry: FoodLogEntry) => {
    try {
      await deleteEntry({id: entry.id}).unwrap();
    } catch {
      toast.danger("Couldn't remove it. Try again.");
    }
  };

  const logWholeMeal = async (slot: SlotView) => {
    if (!slot.mealId) {
      return;
    }
    try {
      await logMeal({foodLogEntryRequest: {date, meal_id: slot.mealId, meal_slot: slot.slot}}).unwrap();
    } catch {
      toast.danger("Couldn't log the meal. Try again.");
    }
  };

  const openSheet = (slot: SlotView, row: PlannedRow) =>
    setSheet({
      date,
      loggedEntry: row.logged,
      mealId: slot.mealId,
      name: row.replaced && row.logged ? (row.logged.food_name ?? 'Food') : (row.item.food_name ?? 'Food'),
      planId: plan?.plan_id,
      plannedIndex: row.position,
      plannedItem: row.item,
      slot: slot.slot,
      slotLabel: slot.label,
    });

  const openExtraSheet = (slot: SlotView, entry: FoodLogEntry) =>
    setSheet({
      date,
      loggedEntry: entry,
      mealId: slot.mealId,
      name: entry.food_name ?? 'Food',
      planId: plan?.plan_id,
      plannedIndex: null,
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
    try {
      if (replacing) {
        // Delete the old entry first so the planned slot never holds two entries
        // (which dayTotals would double-count); a failed create then just reverts to unlogged.
        if (replacing.loggedEntry) {
          await deleteEntry({id: replacing.loggedEntry.id}).unwrap();
        }
        await createEntry({
          foodLogEntryRequest: {
            date,
            food_id: picked.kind === 'food' ? picked.id : undefined,
            meal_id: replacing.mealId ?? undefined,
            meal_slot: replacing.slot,
            plan_id: replacing.planId,
            planned_item_index: replacing.plannedIndex ?? undefined,
            recipe_id: picked.kind === 'recipe' ? picked.id : undefined,
            source: 'replacement',
            weight_g: picked.defaultWeightG,
          },
        }).unwrap();
      } else {
        await createEntry({
          foodLogEntryRequest: {
            date,
            food_id: picked.kind === 'food' ? picked.id : undefined,
            meal_slot: picked.slot,
            recipe_id: picked.kind === 'recipe' ? picked.id : undefined,
            source: 'unplanned',
            weight_g: picked.defaultWeightG,
          },
        }).unwrap();
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
      await logDay({foodLogEntryRequest: {date, plan_id: plan.plan_id}}).unwrap();
    } catch {
      toast.danger("Couldn't log the day. Try again.");
    }
  };

  const anyUnlogged = slots.some((s) => s.planned.some((p) => !p.logged));
  // Past-day adherence verdict (the today plan endpoint 404s with no plan, which is the
  // empty state — only the meal-logs query erroring is a real failure to surface).
  const adh = adherence(consumed.calories, targets.calories);
  const verdict =
    date < today && consumed.calories > 0 && targets.calories != null && adh !== 'none' ? (
      <p
        className="mt-1.5 text-[11px] font-semibold"
        style={{color: VERDICT_COLOR[adh]}}
      >
        {VERDICT_LABEL[adh]}
      </p>
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
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
        <p className="text-sm text-muted">Couldn't load your day. Check your connection.</p>
        <button
          className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground active:opacity-90"
          onClick={() => {
            refetchLogs();
            refetchPlan();
          }}
          type="button"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 pb-10 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
      {/* Date navigator */}
      <div className="mb-3 flex items-center justify-between border-b border-[#1f1f25] pb-3">
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
          className="grid size-8 place-items-center rounded-lg text-muted active:bg-surface-secondary"
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
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-semibold">{slot.label}</span>
              {slot.allPlannedLogged ? (
                <span className="text-[11px] text-[#7f8cff]">{Math.round(slot.loggedCalories)} · ✓ logged</span>
              ) : slot.mealId && !isFuture ? (
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

            {slot.planned.map((row) => {
              const logged = row.logged;
              const kcal = logged?.calories ?? plannedItemCalories(row.item);
              const name = row.replaced && logged ? (logged.food_name ?? 'Food') : (row.item.food_name ?? 'Food');
              return (
                <div
                  className="flex items-center gap-2.5 border-t border-[#202026] py-1.5 text-xs"
                  key={row.item.meal_item_id}
                >
                  <Checkbox
                    disabled={isFuture}
                    on={!!logged}
                    onPress={() => (logged ? removeEntry(logged) : logPlanned(slot, row))}
                  />
                  <button
                    className="flex flex-1 items-center justify-between gap-2 text-left"
                    disabled={isFuture}
                    onClick={() => openSheet(slot, row)}
                    type="button"
                  >
                    <span className={`flex-1 truncate ${logged ? 'text-[#7c8]' : ''}`}>
                      {name}
                      {row.replaced ? (
                        <span className="ml-1.5 rounded border border-[#34506e] px-1 py-px text-[9px] text-[#9fb0ff]">
                          replaced
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-[11px] text-muted">{kcal != null ? Math.round(kcal) : '—'}</span>
                  </button>
                </div>
              );
            })}

            {slot.extras.map((entry) => (
              <div
                className="flex items-center gap-2.5 border-t border-[#202026] py-1.5 text-xs"
                key={entry.id}
              >
                <Checkbox
                  disabled={isFuture}
                  on
                  onPress={() => removeEntry(entry)}
                />
                <button
                  className="flex flex-1 items-center justify-between gap-2 text-left"
                  disabled={isFuture}
                  onClick={() => openExtraSheet(slot, entry)}
                  type="button"
                >
                  <span className="flex-1 truncate text-[#7c8]">
                    {entry.food_name ?? 'Food'}
                    <span className="ml-1.5 rounded border border-[#7d5a2f] px-1 py-px text-[9px] text-warning">
                      off-plan
                    </span>
                  </span>
                  <span className="shrink-0 text-[11px] text-muted">{Math.round(entry.calories ?? 0)}</span>
                </button>
              </div>
            ))}
          </div>
        ))
      )}

      {!isFuture ? (
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
    </div>
  );
}

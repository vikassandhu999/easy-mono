/**
 * Amount sheet (spec 02-logging, option 2). Tap a meal item → docked bottom sheet:
 * adjust the portion (live macro recompute), Log it / Save, Replace, or Not eaten.
 * Handles an unlogged planned item (create), a logged entry (update/delete), or an
 * off-plan extra. Replace hands off to the food picker via onReplace.
 * ponytail: native numeric input instead of a custom keypad — the OS keypad is the
 * platform feature, and macros still update live on change.
 */
import {Trash2} from 'lucide-react';
import {useState} from 'react';

import {
  type FoodLogEntry,
  type SwitchOptionRequest,
  type TodayPlanItem,
  useDeleteFoodLogEntryMutation,
  useLogPlannedItemMutation,
  useUpdateFoodLogEntryMutation,
} from '@/api/nutrition';

export type SheetTarget = {
  date: string;
  loggedEntry: FoodLogEntry | null;
  mealId: null | string;
  name: string;
  mealItemId: null | string;
  plannedItem: null | TodayPlanItem;
  slot: string;
  slotLabel: string;
};

type Macros = {c: number; cal: number; f: number; p: number};

export default function AmountSheet({
  target,
  onClose,
  onReplace,
}: {
  onClose: () => void;
  onReplace: (target: SheetTarget) => void;
  target: SheetTarget;
}) {
  const logPlanned = useLogPlannedItemMutation();
  const updateEntry = useUpdateFoodLogEntryMutation();
  const deleteEntry = useDeleteFoodLogEntryMutation();
  const busy = logPlanned.isPending || updateEntry.isPending || deleteEntry.isPending;

  const {loggedEntry, plannedItem} = target;
  const portion = plannedItem?.portion;
  // Servings mode: recipe items the plan sizes by servings (no grams).
  const servings = loggedEntry
    ? loggedEntry.weight_g == null && loggedEntry.amount != null
    : portion?.kind === 'serving';
  const unitLabel = servings ? (loggedEntry?.unit ?? portion?.unit) || 'serving' : 'g';
  const plannedPortion = servings
    ? (loggedEntry?.amount ?? portion?.amount ?? 1)
    : (loggedEntry?.weight_g ?? portion?.grams ?? 100);
  // raw string so decimals (0.5) and a cleared field stay typeable; parse on use.
  const [raw, setRaw] = useState<string>(String(plannedPortion));
  const [free, setFree] = useState(false);
  const weight = Math.max(0, Number(raw) || 0);

  // Scale the planned item's resolved nutrients, or an existing entry's frozen macros.
  const liveMacros = (w: number): Macros | null => {
    const plannedBase = servings ? (portion?.amount ?? 0) : (portion?.grams ?? 0);
    if (!loggedEntry && plannedItem && plannedBase > 0) {
      const k = w / plannedBase;
      return {
        c: (plannedItem.nutrients.carbohydrates ?? 0) * k,
        cal: (plannedItem.nutrients.calories ?? 0) * k,
        f: (plannedItem.nutrients.fat ?? 0) * k,
        p: (plannedItem.nutrients.protein ?? 0) * k,
      };
    }
    const base = servings ? loggedEntry?.amount : loggedEntry?.weight_g;
    if (loggedEntry && base) {
      const k = w / base;
      return {
        c: (loggedEntry.carbs_g ?? 0) * k,
        cal: (loggedEntry.calories ?? 0) * k,
        f: (loggedEntry.fat_g ?? 0) * k,
        p: (loggedEntry.protein_g ?? 0) * k,
      };
    }
    return null;
  };
  const m = liveMacros(weight);

  const logIt = async () => {
    try {
      const portion = servings ? {amount: weight, unit: unitLabel} : {unit: 'g', weight_g: weight};
      if (loggedEntry) {
        await updateEntry.mutateAsync({...portion, id: loggedEntry.id});
      } else if (plannedItem && target.mealItemId) {
        await logPlanned.mutateAsync({
          date: target.date,
          meal_id: target.mealId ?? undefined,
          meal_slot: target.slot as SwitchOptionRequest['meal_slot'],
          planned_item_id: target.mealItemId,
          ...portion,
        });
      }
      onClose();
    } catch {
      // the mutation's error state surfaces the failure
    }
  };

  const notEaten = async () => {
    if (!loggedEntry) {
      onClose();
      return;
    }
    try {
      await deleteEntry.mutateAsync(loggedEntry.id);
      onClose();
    } catch {
      // the mutation's error state surfaces the failure
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-[rgba(8,8,11,0.5)]">
      <button
        aria-label="Close amount sheet"
        className="flex-1 cursor-default"
        onClick={onClose}
        type="button"
      />
      <div
        aria-label={`Adjust ${target.name}`}
        aria-modal="true"
        className="rounded-t-[28px] bg-background p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] shadow-[0_-18px_50px_rgba(8,8,11,0.22)]"
        role="dialog"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--scrollbar)]" />
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="min-w-0 truncate font-semibold">{target.name}</span>
          <span className="shrink-0 text-[11px] text-muted">{target.slotLabel}</span>
        </div>

        <div className="mb-2.5 flex gap-2">
          <button
            aria-pressed={!free}
            className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-medium ${
              !free ? 'border-accent bg-accent-soft text-accent' : 'border-border text-muted'
            }`}
            onClick={() => {
              setFree(false);
              setRaw(String(plannedPortion));
            }}
            type="button"
          >
            as planned · {plannedPortion}
            {servings ? ` ${unitLabel}` : 'g'}
          </button>
          <button
            aria-pressed={free}
            className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-medium ${
              free ? 'border-accent bg-accent-soft text-accent' : 'border-border text-muted'
            }`}
            onClick={() => setFree(true)}
            type="button"
          >
            {servings ? unitLabel : 'grams'}
          </button>
        </div>

        <label className="mb-2.5 block rounded-[10px] border border-accent bg-surface-secondary px-3 py-2 text-center">
          <span className="block text-[8px] uppercase tracking-wider text-muted">Amount</span>
          <span className="flex items-baseline justify-center gap-1">
            <input
              className="w-20 bg-transparent text-center text-xl font-bold text-foreground outline-none"
              disabled={!free}
              inputMode="decimal"
              onChange={(e) => setRaw(e.target.value)}
              type="text"
              value={raw}
            />
            <span className="text-sm text-muted">{unitLabel}</span>
          </span>
        </label>

        {m ? (
          <div className="mb-3 flex items-center justify-between rounded-[10px] border border-border bg-surface-secondary px-3 py-2">
            <span>
              <span className="block text-[10px] text-muted">eaten →</span>
              <span className="font-bold">{Math.round(m.cal)} kcal</span>
            </span>
            <span className="text-[10px] text-accent">
              {Math.round(m.p)}P · {Math.round(m.c)}C · {Math.round(m.f)}F
            </span>
          </div>
        ) : null}

        <button
          className="mb-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-[13px] bg-accent py-3 text-[15px] font-extrabold text-white disabled:opacity-50"
          disabled={busy}
          onClick={logIt}
          type="button"
        >
          ✓ {loggedEntry ? 'Save' : 'Log it'}
        </button>
        <div className="flex gap-2">
          {target.mealItemId ? (
            <button
              className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-border py-2.5 text-xs font-semibold text-foreground active:bg-surface-secondary disabled:opacity-50"
              disabled={busy}
              onClick={() => onReplace(target)}
              type="button"
            >
              🔄 Replace
            </button>
          ) : null}
          {loggedEntry ? (
            <button
              className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-border py-2.5 text-xs font-semibold text-foreground active:bg-surface-secondary disabled:opacity-50"
              disabled={busy}
              onClick={notEaten}
              type="button"
            >
              <Trash2 size={13} />
              Not eaten
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * Amount sheet (spec 02-logging, option 2). Tap a meal item → docked bottom sheet:
 * adjust the portion (live macro recompute), Log it / Save, Replace, or Not eaten.
 * Handles an unlogged planned item (create), a logged entry (update/delete), or an
 * off-plan extra. Replace hands off to the food picker via onReplace.
 * ponytail: native numeric input instead of a custom keypad — the OS keypad is the
 * platform feature, and macros still update live on change.
 */
import {parseNutritionPortion, toPortionInput} from '@easy/utils/nutrition-portion';
import {Trash2} from 'lucide-react';
import {useRef, useState} from 'react';
import {useDeleteDiaryEntryMutation, useLogPlannedItemMutation, useUpdateDiaryEntryMutation} from '@/api/nutrition';
import {
  type DiaryCommandIntent,
  deleteEntryIntentFingerprint,
  diaryCommandKey,
  plannedItemIntentFingerprint,
  updateEntryIntentFingerprint,
} from '@/nutrition/diary-command-key';
import {diaryWriteError} from '@/nutrition/diary-write-error';
import {type SheetTarget} from '@/nutrition/nutrition-utils';

export type {SheetTarget};

type Macros = {c: number; cal: number; f: number; p: number};

function plannedPortion(target: SheetTarget) {
  if (target.mode === 'logged') {
    return (
      parseNutritionPortion(target.loggedEntry.portion) ??
      (target.plannedItem ? parseNutritionPortion(target.plannedItem.portion) : null)
    );
  }
  return parseNutritionPortion(target.plannedItem.portion);
}

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
  const updateEntry = useUpdateDiaryEntryMutation();
  const deleteEntry = useDeleteDiaryEntryMutation();
  const busy = logPlanned.isPending || updateEntry.isPending || deleteEntry.isPending;
  const commandIntent = useRef<DiaryCommandIntent | null>(null);

  const parsedPlanned = plannedPortion(target);
  const loggedParsed = target.mode === 'logged' ? parseNutritionPortion(target.loggedEntry.portion) : null;
  const servings = loggedParsed?.kind === 'serving' || parsedPlanned?.kind === 'serving';
  const unitLabel =
    servings && loggedParsed?.kind === 'serving'
      ? loggedParsed.unit
      : servings && parsedPlanned?.kind === 'serving'
        ? parsedPlanned.unit
        : 'g';
  const plannedPortionValue =
    parsedPlanned?.kind === 'serving'
      ? parsedPlanned.amount
      : parsedPlanned?.kind === 'gram'
        ? parsedPlanned.grams
        : 100;
  const loggedPortionValue =
    loggedParsed?.kind === 'serving'
      ? loggedParsed.amount
      : loggedParsed?.kind === 'gram'
        ? loggedParsed.grams
        : plannedPortionValue;
  const [raw, setRaw] = useState<string>(String(target.mode === 'logged' ? loggedPortionValue : plannedPortionValue));
  const [notes, setNotes] = useState(target.mode === 'logged' ? (target.loggedEntry.notes ?? '') : '');
  const [free, setFree] = useState(false);
  const [error, setError] = useState<null | string>(null);
  const weight = Math.max(0, Number(raw) || 0);

  const liveMacros = (w: number): Macros | null => {
    if (target.mode === 'planned') {
      const base = parsedPlanned?.kind === 'serving' ? parsedPlanned.amount : parsedPlanned?.grams;
      if (base && base > 0) {
        const k = w / base;
        return {
          c: (target.plannedItem.nutrients.carbohydrates ?? 0) * k,
          cal: (target.plannedItem.nutrients.calories ?? 0) * k,
          f: (target.plannedItem.nutrients.fat ?? 0) * k,
          p: (target.plannedItem.nutrients.protein ?? 0) * k,
        };
      }
      return null;
    }

    const base = loggedParsed?.kind === 'serving' ? loggedParsed.amount : loggedParsed?.grams;
    if (base) {
      const k = w / base;
      return {
        c: (target.loggedEntry.nutrients.carbohydrates ?? 0) * k,
        cal: (target.loggedEntry.nutrients.calories ?? 0) * k,
        f: (target.loggedEntry.nutrients.fat ?? 0) * k,
        p: (target.loggedEntry.nutrients.protein ?? 0) * k,
      };
    }
    return null;
  };
  const m = liveMacros(weight);

  const logIt = async () => {
    try {
      setError(null);
      if (target.mode === 'logged') {
        const normalizedNotes = notes.trim() || null;
        commandIntent.current = diaryCommandKey(
          commandIntent.current,
          updateEntryIntentFingerprint({
            date: target.date,
            entryId: target.loggedEntry.id,
            expectedRevision: target.loggedEntry.revision,
            notes: normalizedNotes,
            weight,
          }),
        );
        await updateEntry.mutateAsync({
          date: target.date,
          expected_revision: target.loggedEntry.revision,
          id: target.loggedEntry.id,
          idempotencyKey: commandIntent.current.key,
          notes: normalizedNotes,
          portion: servings
            ? toPortionInput({
                amount: weight,
                kind: 'serving',
                label: loggedParsed?.kind === 'serving' ? loggedParsed.label : null,
                unit: unitLabel,
              })
            : toPortionInput({grams: weight, kind: 'gram'}),
        });
        commandIntent.current = null;
      } else {
        commandIntent.current = diaryCommandKey(
          commandIntent.current,
          plannedItemIntentFingerprint({
            date: target.date,
            mealItemId: target.mealItemId,
            slot: target.slot,
          }),
        );
        await logPlanned.mutateAsync({
          date: target.date,
          idempotencyKey: commandIntent.current.key,
          meal_item_id: target.mealItemId,
          meal_slot: target.slot,
        });
        commandIntent.current = null;
      }
      onClose();
    } catch (caught) {
      setError(diaryWriteError(caught, "Couldn't save it. Try again."));
    }
  };

  const notEaten = async () => {
    if (target.mode !== 'logged') {
      onClose();
      return;
    }
    try {
      setError(null);
      commandIntent.current = diaryCommandKey(
        commandIntent.current,
        deleteEntryIntentFingerprint({
          date: target.date,
          entryId: target.loggedEntry.id,
          expectedRevision: target.loggedEntry.revision,
        }),
      );
      await deleteEntry.mutateAsync({
        date: target.date,
        expected_revision: target.loggedEntry.revision,
        id: target.loggedEntry.id,
        idempotencyKey: commandIntent.current.key,
      });
      commandIntent.current = null;
      onClose();
    } catch (caught) {
      setError(diaryWriteError(caught, "Couldn't remove it. Try again."));
    }
  };

  const canReplace = target.mode === 'planned' || target.mealItemId != null;

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
              setRaw(String(target.mode === 'logged' ? loggedPortionValue : plannedPortionValue));
            }}
            type="button"
          >
            as planned · {target.mode === 'logged' ? loggedPortionValue : plannedPortionValue}
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

        {target.mode === 'logged' ? (
          <textarea
            className="mb-3 min-h-16 w-full resize-none rounded-xl border border-field-border bg-surface-secondary p-3 text-sm outline-none focus:border-accent"
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Add a note for your coach (optional)"
            value={notes}
          />
        ) : null}

        {error ? <p className="mb-2 text-center text-[11px] text-danger">{error}</p> : null}

        <button
          className="mb-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-[13px] bg-accent py-3 text-[15px] font-extrabold text-white disabled:opacity-50"
          disabled={busy}
          onClick={logIt}
          type="button"
        >
          ✓ {target.mode === 'logged' ? 'Save' : 'Log it'}
        </button>
        <div className="flex gap-2">
          {canReplace ? (
            <button
              className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-border py-2.5 text-xs font-semibold text-foreground active:bg-surface-secondary disabled:opacity-50"
              disabled={busy}
              onClick={() => onReplace(target)}
              type="button"
            >
              🔄 Replace
            </button>
          ) : null}
          {target.mode === 'logged' ? (
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

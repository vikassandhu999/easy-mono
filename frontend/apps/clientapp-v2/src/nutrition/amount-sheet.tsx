import {MEAL_SLOT_LABELS} from '@easy/utils';
import {Trash2} from 'lucide-react';
import {useState} from 'react';
import type {DiaryMealSlot, NutritionDayRow} from '@/api/nutrition';
import type {NutritionPortion} from '@/api/schema';
import {diaryWriteError} from '@/nutrition/diary-write-error';

export default function AmountSheet({
  busy,
  onSave,
  onRemove,
  slot,
  row,
  onClose,
  onReplace,
}: {
  busy: boolean;
  onSave: (portion: NutritionPortion, notes: string | null) => Promise<void>;
  onRemove: () => Promise<void>;
  slot: DiaryMealSlot;
  row: NutritionDayRow;
  onClose: () => void;
  onReplace: () => void;
}) {
  const baseline = row.portion.kind === 'gram' ? row.portion.grams : row.portion.amount;
  const unit = row.portion.kind === 'gram' ? 'g' : row.portion.unit;
  const [raw, setRaw] = useState(String(baseline));
  const [notes, setNotes] = useState(row.notes ?? '');
  const [error, setError] = useState<string | null>(null);
  const amount = Number(raw);
  const valid = Number.isFinite(amount) && amount > 0;

  const save = async () => {
    try {
      setError(null);
      await onSave(
        row.portion.kind === 'gram' ? {...row.portion, grams: amount} : {...row.portion, amount},
        notes.trim() || null,
      );
      onClose();
    } catch (caught) {
      setError(diaryWriteError(caught, "Couldn't save it. Try again."));
    }
  };

  const remove = async () => {
    if (!row.entry_id) {
      return;
    }
    try {
      setError(null);
      await onRemove();
      onClose();
    } catch (caught) {
      setError(diaryWriteError(caught, "Couldn't remove it. Try again."));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-[rgba(8,8,11,0.5)]">
      <button
        aria-label="Close amount sheet"
        className="flex-1 cursor-default"
        disabled={busy}
        onClick={onClose}
        type="button"
      />
      <div
        aria-label={`Adjust ${row.name}`}
        aria-modal="true"
        role="dialog"
        className="rounded-t-[28px] bg-background p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] shadow-[0_-18px_50px_rgba(8,8,11,0.22)]"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--scrollbar)]" />
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="min-w-0 truncate font-semibold">{row.name}</span>
          <span className="shrink-0 text-[11px] text-muted">{MEAL_SLOT_LABELS[slot]}</span>
        </div>
        <fieldset disabled={busy}>
          <label className="mb-3 block rounded-xl border border-accent bg-surface-secondary px-3 py-2 text-center">
            <span className="block text-[10px] uppercase tracking-wider text-muted">Amount</span>
            <span className="flex items-baseline justify-center gap-1">
              <input
                aria-label="Amount"
                className="w-24 bg-transparent text-center text-xl font-bold text-foreground outline-none"
                inputMode="decimal"
                onChange={(event) => setRaw(event.target.value)}
                type="text"
                value={raw}
              />
              <span className="text-sm text-muted">{unit}</span>
            </span>
          </label>
          <textarea
            aria-label="Note for coach"
            className="mb-3 min-h-16 w-full resize-none rounded-xl border border-field-border bg-surface-secondary p-3 text-sm outline-none focus:border-accent"
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Add a note for your coach (optional)"
            value={notes}
          />
          {error ? (
            <p
              role="alert"
              className="mb-2 text-center text-xs text-danger"
            >
              {error}
            </p>
          ) : null}
          <button
            className="mb-2 min-h-12 w-full rounded-xl bg-accent py-3 text-base font-bold text-white disabled:opacity-50"
            disabled={busy || !valid}
            onClick={save}
            type="button"
          >
            {row.entry_id ? 'Save' : 'Log it'}
          </button>
          <div className="flex gap-2">
            <button
              className="flex-1 rounded-xl border border-border py-2.5 text-xs font-semibold"
              onClick={onReplace}
              type="button"
            >
              Replace
            </button>
            {row.entry_id ? (
              <button
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border py-2.5 text-xs font-semibold"
                onClick={remove}
                type="button"
              >
                <Trash2 size={13} />
                Not eaten
              </button>
            ) : null}
          </div>
        </fieldset>
      </div>
    </div>
  );
}

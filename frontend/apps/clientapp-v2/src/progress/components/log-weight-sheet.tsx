/**
 * Log-weight sheet — docked bottom sheet to add a weight entry: value + unit toggle,
 * date (native input), optional note. Mirrors the nutrition amount sheet pattern.
 */
import {toast} from '@heroui/react';
import {useState} from 'react';

import {useCreateWeightEntryMutation} from '@/api/progress';

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function LogWeightSheet({
  defaultUnit,
  defaultValue,
  onClose,
}: {
  defaultUnit: 'kg' | 'lbs';
  defaultValue?: number;
  onClose: () => void;
}) {
  const [create, {isLoading}] = useCreateWeightEntryMutation();
  const [value, setValue] = useState(defaultValue != null ? String(defaultValue) : '');
  const [unit, setUnit] = useState<'kg' | 'lbs'>(defaultUnit);
  const [date, setDate] = useState(todayStr());
  const [note, setNote] = useState('');

  const num = Number(value);
  const valid = Number.isFinite(num) && num > 0;

  const save = async () => {
    if (!valid) {
      return;
    }
    try {
      await create({weightEntryRequest: {date, note: note.trim() || null, unit, value: num}}).unwrap();
      onClose();
    } catch {
      toast.danger("Couldn't save your weight. Try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60">
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop dismiss, the sheet has real controls */}
      <div
        className="flex-1"
        onClick={onClose}
      />
      <div
        aria-label="Log weight"
        aria-modal="true"
        className="rounded-t-2xl border-t border-[#34343d] bg-surface p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-[0_-12px_30px_rgba(0,0,0,0.5)]"
        role="dialog"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#444]" />
        <p className="mb-3 font-semibold">Log weight</p>

        <div className="mb-2.5 flex items-stretch gap-2">
          <label className="flex flex-1 items-baseline gap-1 rounded-[10px] border border-accent bg-[#10131f] px-3 py-2">
            {/* biome-ignore lint/a11y/noAutofocus: the weight value is the point of this sheet */}
            <input
              autoFocus
              className="w-full bg-transparent text-2xl font-bold text-foreground outline-none"
              inputMode="decimal"
              onChange={(e) => setValue(e.target.value)}
              placeholder="0"
              type="text"
              value={value}
            />
          </label>
          <div className="flex overflow-hidden rounded-[10px] border border-[#34343d]">
            {(['kg', 'lbs'] as const).map((u) => (
              <button
                aria-pressed={unit === u}
                className={`px-3 text-sm font-semibold ${unit === u ? 'bg-accent text-accent-foreground' : 'text-muted'}`}
                key={u}
                onClick={() => setUnit(u)}
                type="button"
              >
                {u}
              </button>
            ))}
          </div>
        </div>

        <input
          aria-label="Date"
          className="mb-2.5 w-full rounded-[10px] border border-border bg-surface-secondary px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent [color-scheme:dark]"
          max={todayStr()}
          onChange={(e) => setDate(e.target.value)}
          type="date"
          value={date}
        />

        <input
          className="mb-3 w-full rounded-[10px] border border-border bg-surface-secondary px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent"
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optional)"
          type="text"
          value={note}
        />

        <button
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-[15px] font-bold text-accent-foreground transition-opacity active:opacity-90 disabled:opacity-50"
          disabled={!valid || isLoading}
          onClick={save}
          type="button"
        >
          Save
        </button>
      </div>
    </div>
  );
}

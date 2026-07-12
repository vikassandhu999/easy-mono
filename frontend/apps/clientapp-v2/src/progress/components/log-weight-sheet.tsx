import {toast} from '@heroui/react';
import {Minus, Plus} from 'lucide-react';
import {useState} from 'react';

import {useCreateWeightEntryMutation} from '@/api/progress';

function dateFor(when: 'Today' | 'Yesterday'): string {
  const date = new Date();
  if (when === 'Yesterday') {
    date.setDate(date.getDate() - 1);
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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
  const [value, setValue] = useState(defaultValue ?? 80);
  const [unit, setUnit] = useState<'kg' | 'lbs'>(defaultUnit);
  const [when, setWhen] = useState<'Today' | 'Yesterday'>('Today');
  const [note, setNote] = useState('');

  const selectUnit = (next: 'kg' | 'lbs') => {
    if (next === unit) {
      return;
    }
    setValue(Math.round((next === 'lbs' ? value * 2.20462 : value / 2.20462) * 10) / 10);
    setUnit(next);
  };
  const adjust = (delta: number) => setValue((current) => Math.max(1, Math.round((current + delta) * 10) / 10));
  const save = async () => {
    try {
      await create({weightEntryRequest: {date: dateFor(when), note: note.trim() || null, unit, value}}).unwrap();
      toast.success('Weight logged');
      onClose();
    } catch {
      toast.danger("Couldn't save your weight. Try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-[rgba(8,8,11,0.5)]">
      <button
        aria-label="Close weight sheet"
        className="flex-1 cursor-default"
        onClick={onClose}
        type="button"
      />
      <div
        aria-label="Log weight"
        aria-modal="true"
        className="rounded-t-[28px] bg-background p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]"
        role="dialog"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#c3c7ce]" />
        <h2 className="mb-4 text-xl font-extrabold tracking-[-0.02em]">Log weight</h2>
        <div className="mb-3 flex items-center gap-2">
          <button
            aria-label="Decrease weight"
            className="grid size-12 place-items-center rounded-xl border border-border bg-white"
            onClick={() => adjust(unit === 'kg' ? -0.1 : -0.2)}
            type="button"
          >
            <Minus size={18} />
          </button>
          <label className="flex min-h-14 min-w-0 flex-1 items-baseline justify-center gap-1 rounded-xl border border-accent bg-white px-3">
            <span className="sr-only">Weight</span>
            <input
              aria-label="Weight"
              className="w-24 bg-transparent text-center text-[28px] font-extrabold outline-none"
              inputMode="decimal"
              onChange={(event) => setValue(Number(event.target.value) || 0)}
              type="text"
              value={value}
            />
            <span className="font-bold text-muted">{unit}</span>
          </label>
          <button
            aria-label="Increase weight"
            className="grid size-12 place-items-center rounded-xl border border-border bg-white"
            onClick={() => adjust(unit === 'kg' ? 0.1 : 0.2)}
            type="button"
          >
            <Plus size={18} />
          </button>
        </div>
        <div className="mb-3 grid grid-cols-2 overflow-hidden rounded-xl border border-border bg-white">
          {(['kg', 'lbs'] as const).map((option) => (
            <button
              aria-pressed={unit === option}
              className={`min-h-11 font-bold ${unit === option ? 'bg-accent text-white' : 'text-muted'}`}
              key={option}
              onClick={() => selectUnit(option)}
              type="button"
            >
              {option}
            </button>
          ))}
        </div>
        <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.1em] text-muted">When</p>
        <div className="mb-3 flex gap-2">
          {(['Today', 'Yesterday'] as const).map((option) => (
            <button
              aria-pressed={when === option}
              className={`min-h-10 flex-1 rounded-xl border text-sm font-bold ${when === option ? 'border-accent bg-accent-soft text-accent' : 'border-border bg-white text-muted'}`}
              key={option}
              onClick={() => setWhen(option)}
              type="button"
            >
              {option}
            </button>
          ))}
        </div>
        <input
          className="mb-3 w-full rounded-xl border border-field-border bg-white px-3 py-3 text-sm outline-none focus:border-accent"
          onChange={(event) => setNote(event.target.value)}
          placeholder="Note (optional)"
          type="text"
          value={note}
        />
        <button
          className="min-h-[50px] w-full rounded-[14px] bg-accent text-[15px] font-extrabold text-white disabled:opacity-50"
          disabled={isLoading || value <= 0}
          onClick={save}
          type="button"
        >
          Save
        </button>
      </div>
    </div>
  );
}

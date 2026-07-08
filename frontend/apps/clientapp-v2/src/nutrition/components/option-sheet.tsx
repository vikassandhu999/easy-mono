/**
 * Option sheet — docked bottom sheet listing a slot's meal options (name + kcal),
 * active one marked. Mirrors amount-sheet's hand-rolled bottom-sheet shell.
 */
import {Check} from 'lucide-react';

import type {TodayPlanOption} from '@/api/nutrition';
import {optionCalories} from '@/nutrition/nutrition-utils';

export default function OptionSheet({
  activeMealId,
  onClose,
  onSelect,
  options,
  slotLabel,
}: {
  activeMealId: null | string;
  onClose: () => void;
  onSelect: (option: TodayPlanOption) => void;
  options: TodayPlanOption[];
  slotLabel: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60">
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop dismiss, the sheet has real controls */}
      <div
        className="flex-1"
        onClick={onClose}
      />
      <div
        aria-label={`Choose ${slotLabel} option`}
        aria-modal="true"
        className="rounded-t-2xl border-t border-[#34343d] bg-surface p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-[0_-12px_30px_rgba(0,0,0,0.5)]"
        role="dialog"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#444]" />
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="min-w-0 truncate font-semibold">Choose option</span>
          <span className="shrink-0 text-[11px] text-muted">{slotLabel}</span>
        </div>

        <div className="flex flex-col gap-2">
          {options.map((option) => {
            const active = option.meal_id === activeMealId;
            return (
              <button
                aria-pressed={active}
                className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-sm ${
                  active ? 'border-accent bg-[#1d2030]' : 'border-border'
                }`}
                key={option.meal_id}
                onClick={() => onSelect(option)}
                type="button"
              >
                <span className="flex min-w-0 items-center gap-2">
                  {active ? (
                    <Check
                      className="shrink-0 text-accent"
                      size={15}
                    />
                  ) : null}
                  <span className="truncate font-medium">{option.meal_name ?? 'Option'}</span>
                </span>
                <span className="shrink-0 text-xs text-muted">{Math.round(optionCalories(option))} kcal</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

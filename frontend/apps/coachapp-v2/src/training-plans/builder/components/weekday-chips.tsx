/**
 * The seven weekday chips that schedule ONE workout (badge TB).
 *
 * GAPS #8: a `ToggleButtonGroup`, with the exclusivity rule — a weekday holds at
 * most one workout — living in the command layer, not here. This component only
 * reports which day the coach turned on or off.
 */
import {TRAINING_DAY_LABELS as DAY_LABELS, TRAINING_DAY_SHORT_LABELS as DAY_SHORT_LABELS} from '@easy/utils';
import {ToggleButton, ToggleButtonGroup} from '@heroui/react';

import {type Day, ORDERED_DAYS} from '../schedule';

const CHIP_CLASS =
  'size-11 shrink-0 rounded-chip border border-border bg-transparent px-0 type-eyebrow font-semibold text-muted ' +
  '[row-gap:normal] [column-gap:normal] ' +
  'data-[selected=true]:border-accent data-[selected=true]:bg-accent-tint data-[selected=true]:text-accent sm:size-8';

interface WeekdayChipsProps {
  workoutName: string;
  selected: Day[];
  onToggle: (day: Day, isSelected: boolean) => void;
}

export function WeekdayChips({workoutName, selected, onToggle}: WeekdayChipsProps) {
  return (
    <ToggleButtonGroup
      aria-label={`Weekdays for ${workoutName}`}
      className="flex flex-nowrap gap-1.5"
      data-testid="tb-wdays"
      onSelectionChange={(keys) => {
        const next = new Set([...keys].map(String));
        for (const day of ORDERED_DAYS) {
          const wasSelected = selected.includes(day);
          const isSelected = next.has(day);
          if (wasSelected !== isSelected) {
            onToggle(day, isSelected);
          }
        }
      }}
      selectedKeys={selected}
      selectionMode="multiple"
    >
      {ORDERED_DAYS.map((day) => (
        <ToggleButton
          aria-label={`${DAY_LABELS[day]} for ${workoutName}`}
          className={CHIP_CLASS}
          data-testid={selected.includes(day) ? 'tb-wday-on' : 'tb-wday-off'}
          id={day}
          key={day}
        >
          {DAY_SHORT_LABELS[day]}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

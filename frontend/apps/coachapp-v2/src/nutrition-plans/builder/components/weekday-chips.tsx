/**
 * WeekdayChips — the Mon..Sun toggles on the day-tabs row. A weekday belongs
 * to exactly one day, so tapping a chip assigns it to the ACTIVE day and
 * implicitly takes it off whichever day held it; the exclusivity lives here in
 * screen code, not in a reusable component (GAPS #8).
 */
import {WEEKDAY_SHORT_LABELS, WEEKDAYS} from '@easy/utils';
import {ToggleButton, ToggleButtonGroup} from '@heroui/react';

import type {NutritionPlanDay} from '@/api/nutrition-plan-builder';

import type {WeekdayAssignments} from '../plan-tree';
import {assignedWeekdays} from '../schedule';

interface WeekdayChipsProps {
  activeDay: NutritionPlanDay;
  assignments: WeekdayAssignments;
  onAssign: (weekday: string) => void;
}

export function WeekdayChips({activeDay, assignments, onAssign}: WeekdayChipsProps) {
  return (
    <ToggleButtonGroup
      aria-label={`Weekdays on ${activeDay.name}`}
      className="ml-auto flex gap-1"
      data-testid="nb-wdays"
      onSelectionChange={(keys) => {
        const next = new Set([...keys].map(String));
        for (const weekday of next) {
          if (assignments[weekday] !== activeDay.id) {
            onAssign(weekday);
          }
        }
      }}
      selectedKeys={assignedWeekdays(assignments, activeDay.id)}
      selectionMode="multiple"
    >
      {WEEKDAYS.map((weekday) => (
        <ToggleButton
          aria-label={`${WEEKDAY_SHORT_LABELS[weekday] ?? weekday} on ${activeDay.name}`}
          className="size-11 rounded-control border border-border bg-transparent p-0 type-eyebrow font-semibold text-muted data-[selected=true]:border-accent data-[selected=true]:bg-accent-tint data-[selected=true]:text-accent sm:size-7.5 [row-gap:normal] [column-gap:normal]"
          data-testid={assignments[weekday] === activeDay.id ? 'nb-wday-on' : 'nb-wday-off'}
          id={weekday}
          key={weekday}
        >
          {(WEEKDAY_SHORT_LABELS[weekday] ?? weekday).charAt(0)}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

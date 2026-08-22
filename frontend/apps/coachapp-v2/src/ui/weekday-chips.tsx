/**
 * WeekdayChips — the Mon..Sun squares that schedule one day/workout, shared by
 * both plan builders.
 *
 * Both builders ask the same question ("which weekdays does this run on") and
 * both answer it with a multi-select `ToggleButtonGroup`, so there is one
 * component. What differs between them is not the control but the RULE behind
 * it, and that stays with each builder: nutrition assigns a weekday to exactly
 * one day, so it reports the weekday that was turned ON and lets its command
 * layer move it off whoever held it; training toggles a weekday independently,
 * so it reports which way the chip went. Both shapes are the same callback with
 * a boolean, so `onToggle(weekday, isSelected)` serves both and the nutrition
 * caller simply ignores the `false` case (GAPS #8 — the exclusivity rule lives
 * in the command layer, never in this component).
 *
 * The look is the `toggle-button--weekday` theme variant, not a class string
 * here: two hand-written copies of it drifted on five axes and one of them
 * pushed Sunday off the screen at 375px.
 */
import {TRAINING_DAY_LABELS, TRAINING_DAY_SHORT_LABELS, TRAINING_WEEKDAYS, type TrainingWeekday} from '@easy/utils';
import {ToggleButton, ToggleButtonGroup} from '@heroui/react';

interface WeekdayChipsProps {
  /** Names the group for screen readers: "Weekdays on Everyday". */
  ownerName: string;
  selected: readonly string[];
  onToggle: (weekday: TrainingWeekday, isSelected: boolean) => void;
  testIdPrefix: string;
}

export function WeekdayChips({onToggle, ownerName, selected, testIdPrefix}: WeekdayChipsProps) {
  return (
    <ToggleButtonGroup
      aria-label={`Weekdays on ${ownerName}`}
      className="flex flex-nowrap gap-1.5"
      data-testid={`${testIdPrefix}-wdays`}
      onSelectionChange={(keys) => {
        const next = new Set([...keys].map(String));
        for (const weekday of TRAINING_WEEKDAYS) {
          const was = selected.includes(weekday);
          const is = next.has(weekday);
          if (was !== is) {
            onToggle(weekday, is);
          }
        }
      }}
      selectedKeys={[...selected]}
      selectionMode="multiple"
    >
      {TRAINING_WEEKDAYS.map((weekday) => (
        <ToggleButton
          aria-label={`${TRAINING_DAY_LABELS[weekday]} on ${ownerName}`}
          className="toggle-button--weekday"
          data-testid={selected.includes(weekday) ? `${testIdPrefix}-wday-on` : `${testIdPrefix}-wday-off`}
          id={weekday}
          key={weekday}
        >
          {TRAINING_DAY_SHORT_LABELS[weekday]}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

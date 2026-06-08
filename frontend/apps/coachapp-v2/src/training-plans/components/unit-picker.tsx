import type {Key} from '@heroui/react';

import {Button, ListBox, Popover} from '@heroui/react';
import {useState} from 'react';

import type {PlannedSet} from '@/api/trainingPlans';

export type LoadUnitValue = NonNullable<PlannedSet['load_unit']>;

type UnitOption = {
  description?: string;
  label: string;
  value: LoadUnitValue;
};

const OPTIONS: UnitOption[] = [
  {description: 'Kilograms', label: 'Kilograms (kg)', value: 'kg'},
  {description: 'Pounds', label: 'Pounds (lbs)', value: 'lbs'},
  {description: 'No added weight', label: 'Bodyweight', value: 'bodyweight'},
];

/**
 * Pill button label per v3 spec: lowercase `kg` / `lbs` / `bw`.
 *
 * Legacy units (`percent_1rm`, `rpe`, `none`) aren't exposed in the picker
 * anymore — if an existing record carries one we still render a reasonable
 * pill label so editing doesn't look broken, and the coach can change it to
 * one of the three supported units by tapping the pill.
 */
export function getLoadUnitButtonLabel(loadUnit: LoadUnitValue): string {
  if (loadUnit === 'bodyweight') {
    return 'bw';
  }
  if (loadUnit === 'percent_1rm') {
    return '% 1RM';
  }
  if (loadUnit === 'rpe') {
    return 'RPE';
  }
  if (loadUnit === 'none') {
    return '—';
  }
  return loadUnit;
}

type UnitPickerProps = {
  className?: string;
  onChange: (unit: LoadUnitValue) => void;
  value: LoadUnitValue;
};

/**
 * Pill-triggered load-unit picker.
 *
 * Replaces the former bottom-sheet flow with an anchored Popover + ListBox —
 * one tap on the pill reveals three options beside it, keyboard-navigable,
 * dismisses on outside click. No full-screen takeover.
 *
 * The trigger button is owned by this component so the caller doesn't have
 * to wire `isOpen` state manually.
 */
export default function UnitPicker({className, onChange, value}: UnitPickerProps) {
  // Controlled open state so we can dismiss the popover after selection.
  // Without this, react-aria leaves the popover open and the coach has to
  // click the pill / outside to close — one extra tap for every unit change.
  const [isOpen, setIsOpen] = useState(false);

  const handleSelectionChange = (key: Key | null) => {
    if (key == null) {
      return;
    }
    onChange(key as LoadUnitValue);
    setIsOpen(false);
  };

  return (
    <Popover
      isOpen={isOpen}
      onOpenChange={setIsOpen}
    >
      <Popover.Trigger>
        <Button
          aria-label={`Load unit: ${getLoadUnitButtonLabel(value)}`}
          className={className}
          type="button"
          variant="secondary"
        >
          {getLoadUnitButtonLabel(value)}
        </Button>
      </Popover.Trigger>
      <Popover.Content
        className="min-w-[220px] p-1"
        placement="bottom start"
      >
        <Popover.Dialog className="outline-none">
          <ListBox
            aria-label="Load unit"
            onSelectionChange={(keys) => {
              if (keys === 'all') {
                return;
              }
              const next = keys.values().next().value ?? null;
              handleSelectionChange(next);
            }}
            selectedKeys={new Set([value])}
            selectionMode="single"
          >
            {OPTIONS.map((option) => (
              <ListBox.Item
                id={option.value}
                key={option.value}
                textValue={option.label}
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{option.label}</span>
                  {option.description ? (
                    <span className="text-xs text-foreground-400">{option.description}</span>
                  ) : null}
                </div>
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}

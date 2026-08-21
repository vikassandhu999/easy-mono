/**
 * MealSlotControl — the slot tag on a meal card (GAPS.md #9). The tag opens the
 * slot list in a `ResponsiveOverlay`; ONE `ListBox` serves both shells.
 *
 * Deviation from GAPS #9's wording: the trigger is a `Button` styled as a pill,
 * not a `Chip`. HeroUI v3 `Chip` is a display primitive with no press/focus
 * behaviour, so a menu trigger must be a `Button` (UI-CONTRACT §2 "Any button").
 */

import {Button, Label, ListBox} from '@heroui/react';
import {ChevronDown} from 'lucide-react';
import {useRef, useState} from 'react';
import {ResponsiveOverlay} from '@/builder-kit/responsive-overlay';
import {TAG} from '@/builder-kit/ui';
import {MEAL_SLOTS, slotLabel, type BuilderMealSlot} from '../slots';

function isBuilderMealSlot(value: string): value is BuilderMealSlot {
  return (MEAL_SLOTS as readonly string[]).includes(value);
}

interface MealSlotControlProps {
  slot: BuilderMealSlot;
  onChange: (slot: BuilderMealSlot) => void;
}

export function MealSlotControl({slot, onChange}: MealSlotControlProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const label = slotLabel(slot);

  return (
    <>
      <Button
        aria-label={`Meal slot: ${label}`}
        className={`${TAG}  gap-1 text-foreground `}
        data-testid="nb-slot-tag"
        onPress={() => setOpen(true)}
        ref={triggerRef}
        size="sm"
        variant="outline"
      >
        {label}
        <ChevronDown className="size-3.5" />
      </Button>
      <ResponsiveOverlay
        isOpen={open}
        onOpenChange={setOpen}
        title="Meal slot"
        triggerRef={triggerRef}
        width="w-64"
      >
        <ListBox
          aria-label="Meal slot"
          className="p-0"
          disallowEmptySelection
          onSelectionChange={(keys) => {
            const next = [...keys][0];
            setOpen(false);
            if (typeof next === 'string' && isBuilderMealSlot(next)) {
              onChange(next);
            }
          }}
          selectedKeys={[slot]}
          selectionMode="single"
        >
          {MEAL_SLOTS.map((option) => (
            <ListBox.Item
              id={option}
              key={option}
              textValue={slotLabel(option)}
            >
              <Label className="max-w-full truncate">{slotLabel(option)}</Label>
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </ResponsiveOverlay>
    </>
  );
}

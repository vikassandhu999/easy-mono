/**
 * MealSlotControl — the slot tag on a meal card (GAPS.md #9).
 *
 * The tag opens the list of meal slots through `ResponsiveOverlay` — an anchored
 * `Popover` on desktop, a `KeyboardSheet` on mobile (the canonical
 * responsive-overlay rule — UI-CONTRACT §2 Overlays). Both shells render the
 * SAME `ListBox`, so selection semantics are identical at every width.
 *
 * Deviation from GAPS #9's wording: the trigger is a `Button` styled as a pill,
 * not a `Chip`. HeroUI v3 `Chip` is a display primitive with no press/focus
 * behaviour, so a menu trigger must be a `Button` (UI-CONTRACT §2 "Any button").
 */

import {MEAL_SLOTS} from '@easy/utils';
import {Button, Label, ListBox} from '@heroui/react';
import {ChevronDown} from 'lucide-react';
import {useRef, useState} from 'react';

import {ResponsiveOverlay} from '@/builder-kit/responsive-overlay';

/**
 * Sentence-case slot names, per COPY.md § NB. `@easy/utils`' MEAL_SLOT_LABELS
 * is Title Case and shared with the client app, so this screen keeps its own
 * map rather than changing copy for both apps.
 */
export const SLOT_LABELS: Record<string, string> = {
  afternoon_snack: 'Afternoon snack',
  breakfast: 'Breakfast',
  dinner: 'Dinner',
  evening_snack: 'Evening snack',
  lunch: 'Lunch',
  morning_snack: 'Morning snack',
};

export function slotLabel(slot: string): string {
  return SLOT_LABELS[slot] ?? slot;
}

interface MealSlotControlProps {
  slot: string;
  /** Slots already taken on this day — offered but marked, so a coach can see why a move is a swap. */
  onChange: (slot: string) => void;
}

const SHEET_TITLE = 'Meal slot';

export function MealSlotControl({slot, onChange}: MealSlotControlProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const label = slotLabel(slot);

  return (
    <>
      <Button
        aria-label={`Meal slot: ${label}`}
        className="rounded-control border border-border bg-surface px-2.5 text-pill font-medium text-foreground"
        onPress={() => setOpen(true)}
        ref={triggerRef}
        size="sm"
        variant="outline"
      >
        {label}
        <ChevronDown className="size-3.5 text-muted" />
      </Button>

      <ResponsiveOverlay
        isOpen={open}
        onOpenChange={setOpen}
        title={SHEET_TITLE}
        triggerRef={triggerRef}
        width="w-56"
      >
        {/* Selection-mode collections route activation through
            onSelectionChange, NOT onAction — onAction never fires here. */}
        <ListBox
          aria-label={SHEET_TITLE}
          className="p-0"
          disallowEmptySelection
          onSelectionChange={(keys) => {
            const next = [...keys][0];
            setOpen(false);
            if (next) {
              onChange(String(next));
            }
          }}
          selectedKeys={[slot]}
          selectionMode="single"
        >
          {MEAL_SLOTS.map((option) => (
            <ListBox.Item
              className="min-h-11"
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

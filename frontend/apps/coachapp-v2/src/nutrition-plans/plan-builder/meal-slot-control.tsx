/**
 * MealSlotControl — the slot tag on a meal card (GAPS.md #9).
 *
 * The tag opens the list of meal slots: a `Dropdown` on desktop, a
 * `KeyboardSheet` list on mobile (the canonical responsive-overlay rule —
 * UI-CONTRACT §2 Overlays). Both shells render the SAME `ListBox` content.
 *
 * Deviation from GAPS #9's wording: the trigger is a `Button` styled as a pill,
 * not a `Chip`. HeroUI v3 `Chip` is a display primitive with no press/focus
 * behaviour, so a menu trigger must be a `Button` (UI-CONTRACT §2 "Any button").
 */

import {MEAL_SLOTS} from '@easy/utils';
import {Button, Dropdown, Label, ListBox} from '@heroui/react';
import {ChevronDown} from 'lucide-react';
import {useState} from 'react';

import {useIsDesktop} from '@/@hooks/use-is-desktop';
import {KeyboardSheet} from '@/builder-kit/keyboard-sheet';

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
  const isDesktop = useIsDesktop();
  const [open, setOpen] = useState(false);

  const label = slotLabel(slot);

  const trigger = (
    <Button
      aria-label={`Meal slot: ${label}`}
      className="rounded-control border border-border bg-surface px-2.5 text-pill font-medium text-foreground"
      onPress={isDesktop ? undefined : () => setOpen(true)}
      size="sm"
      variant="outline"
    >
      {label}
      <ChevronDown className="size-3.5 text-muted" />
    </Button>
  );

  if (isDesktop) {
    return (
      <Dropdown>
        {trigger}
        <Dropdown.Popover>
          {/* Selection-mode collections route activation through
              onSelectionChange, NOT onAction — onAction never fires here. */}
          <Dropdown.Menu
            disallowEmptySelection
            onSelectionChange={(keys) => {
              const next = [...keys][0];
              if (next) {
                onChange(String(next));
              }
            }}
            selectedKeys={[slot]}
            selectionMode="single"
          >
            {MEAL_SLOTS.map((option) => (
              <Dropdown.Item
                id={option}
                key={option}
                textValue={slotLabel(option)}
              >
                <Label>{slotLabel(option)}</Label>
              </Dropdown.Item>
            ))}
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    );
  }

  return (
    <>
      {trigger}
      <KeyboardSheet
        onClose={() => setOpen(false)}
        open={open}
        title={SHEET_TITLE}
      >
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
      </KeyboardSheet>
    </>
  );
}

import {Button, Popover} from '@heroui/react';
import {cn} from '@heroui/styles';
import {Plus} from 'lucide-react';
import type {ComponentProps} from 'react';
import {useRef, useState} from 'react';

import {useIsDesktop} from '@/@hooks/use-is-desktop';
import type {Food} from '@/api/generated';
import {KeyboardSheet} from '@/builder-kit/keyboard-sheet';
import FoodPickerContent from '@/foods/components/food-picker-content';

interface Props {
  onSelect: (food: Food) => void;
  excludeIds?: string[];
  triggerClassName?: string;
  triggerVariant?: ComponentProps<typeof Button>['variant'];
}

/**
 * "Add ingredient" button + its food-search surface, RESPONSIVE the same way as
 * the nutrition/training PlanAssignControl: an anchored Popover on desktop, a
 * bottom KeyboardSheet on mobile. Body is FoodPickerContent.
 *
 * Keeps its own shell rather than composing `ResponsiveOverlay`: the desktop
 * panel is content-sized (`max-w-md`, no height cap — FoodPickerContent owns its
 * own scroll region) and the mobile sheet is deliberately title-less, so all
 * three of the wrapper's fixed decisions would have to become knobs.
 * The popover chrome tokens still match the wrapper's.
 */
export default function FoodPickerControl({onSelect, excludeIds, triggerClassName, triggerVariant}: Props) {
  const [open, setOpen] = useState(false);
  const isDesktop = useIsDesktop();
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const close = () => {
    setOpen(false);
    // Return focus to the trigger so keyboard users aren't dropped at the top
    // of the document after the picker closes.
    triggerRef.current?.focus();
  };
  const content = (
    <FoodPickerContent
      excludeIds={excludeIds}
      onClose={close}
      onSelect={onSelect}
    />
  );

  return (
    <>
      <Button
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn('min-h-11 ', triggerClassName)}
        onPress={() => setOpen(true)}
        ref={triggerRef}
        variant={triggerVariant ?? 'secondary'}
      >
        <Plus size={16} />
        Add ingredient
      </Button>

      {isDesktop ? (
        <Popover
          isOpen={open}
          onOpenChange={(v) => {
            if (!v) {
              close();
            }
          }}
        >
          <Popover.Content
            className="max-w-md rounded-2xl border border-border bg-surface p-4 shadow-xl"
            triggerRef={triggerRef}
          >
            <Popover.Dialog
              aria-label="Add ingredient"
              className="outline-none"
            >
              {open ? content : null}
            </Popover.Dialog>
          </Popover.Content>
        </Popover>
      ) : (
        <KeyboardSheet
          onClose={close}
          open={open}
        >
          {open ? content : null}
        </KeyboardSheet>
      )}
    </>
  );
}

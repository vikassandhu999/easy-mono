import {Button, Popover} from '@heroui/react';
import {Plus} from 'lucide-react';
import {useEffect, useRef, useState} from 'react';

import type {Food} from '@/api/generated';
import {KeyboardSheet} from '@/builder-kit/keyboard-sheet';
import FoodPickerContent from '@/foods/components/food-picker-content';

interface Props {
  onSelect: (food: Food) => void;
  excludeIds?: string[];
}

/**
 * "Add ingredient" button + its food-search surface, RESPONSIVE the same way as
 * the nutrition/training PlanAssignControl: an anchored Popover on desktop, a
 * bottom KeyboardSheet on mobile. Body is FoodPickerContent.
 */
export default function FoodPickerControl({onSelect, excludeIds}: Props) {
  const [open, setOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.matchMedia('(pointer: fine) and (min-width: 768px)').matches;
  });
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const mq = window.matchMedia('(pointer: fine) and (min-width: 768px)');
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const close = () => setOpen(false);
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
        onPress={() => setOpen(true)}
        ref={triggerRef}
        size="sm"
        variant="secondary"
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
            className="w-[26rem] max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-surface p-4 shadow-xl"
            triggerRef={triggerRef}
          >
            <Popover.Dialog className="outline-none">{open ? content : null}</Popover.Dialog>
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

/**
 * DeleteDayDialog — the delete-day confirm. Its body spells out where the
 * day's weekdays go: meals always survive in the plan, and any weekdays the
 * day held move to the first remaining day (the server does the same).
 */

import {WEEKDAY_SHORT_LABELS, WEEKDAYS} from '@easy/utils';
import {AlertDialog, Button} from '@heroui/react';

import type {Menu, MenuDay} from './menu';

function confirmBody(day: MenuDay, days: MenuDay[], assignments: Menu['schedule']): string {
  const assigned = WEEKDAYS.filter((w) => assignments[w] === day.id);
  if (assigned.length === 0) {
    return 'Its meals stay in the plan.';
  }
  const fallback = days.find((d) => d.id !== day.id);
  const labels = assigned.map((w) => WEEKDAY_SHORT_LABELS[w] ?? w).join(', ');
  return `Its meals stay in the plan. ${labels} will move to "${fallback?.name ?? 'the remaining day'}".`;
}

interface DeleteDayDialogProps {
  day: MenuDay;
  days: MenuDay[];
  assignments: Menu['schedule'];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function DeleteDayDialog({day, days, assignments, isOpen, onOpenChange, onConfirm}: DeleteDayDialogProps) {
  return (
    <AlertDialog.Backdrop
      isDismissable
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      variant="transparent"
    >
      <AlertDialog.Container>
        <AlertDialog.Dialog>
          <AlertDialog.CloseTrigger />
          <AlertDialog.Header>
            <AlertDialog.Icon status="danger" />
            <AlertDialog.Heading>Delete "{day.name}"?</AlertDialog.Heading>
          </AlertDialog.Header>
          <AlertDialog.Body>{confirmBody(day, days, assignments)}</AlertDialog.Body>
          <AlertDialog.Footer>
            <Button
              slot="close"
              variant="tertiary"
            >
              Cancel
            </Button>
            <Button
              className="relative"
              isDisabled={days.length < 2}
              onPress={onConfirm}
              variant="danger"
            >
              Delete
            </Button>
          </AlertDialog.Footer>
        </AlertDialog.Dialog>
      </AlertDialog.Container>
    </AlertDialog.Backdrop>
  );
}

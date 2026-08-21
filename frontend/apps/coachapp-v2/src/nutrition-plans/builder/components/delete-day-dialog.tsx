/**
 * DeleteDayDialog — the delete-day confirm. Its body spells out where the
 * day's weekdays go: meals always survive in the plan, and any weekdays the
 * day held move to the first remaining day (the server does the same).
 */

import {WEEKDAY_SHORT_LABELS, WEEKDAYS} from '@easy/utils';
import {AlertDialog, Button, Spinner} from '@heroui/react';

import type {NutritionPlanDay, WeekdayAssignments} from '../plan-tree';

function confirmBody(day: NutritionPlanDay, days: NutritionPlanDay[], assignments: WeekdayAssignments): string {
  const assigned = WEEKDAYS.filter((w) => assignments[w] === day.id);
  if (assigned.length === 0) {
    return 'Its meals stay in the plan.';
  }
  const fallback = days.filter((d) => d.id !== day.id).sort((a, b) => a.position - b.position)[0];
  const labels = assigned.map((w) => WEEKDAY_SHORT_LABELS[w] ?? w).join(', ');
  return `Its meals stay in the plan. ${labels} will move to "${fallback?.name ?? 'the remaining day'}".`;
}

interface DeleteDayDialogProps {
  day: NutritionPlanDay;
  days: NutritionPlanDay[];
  assignments: WeekdayAssignments;
  deleting: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function DeleteDayDialog({
  day,
  days,
  assignments,
  deleting,
  isOpen,
  onOpenChange,
  onConfirm,
}: DeleteDayDialogProps) {
  return (
    <AlertDialog.Backdrop
      isDismissable={!deleting}
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
              isDisabled={deleting}
              slot="close"
              variant="tertiary"
            >
              Cancel
            </Button>
            <Button
              className="relative"
              isPending={deleting}
              onPress={onConfirm}
              variant="danger"
            >
              <span className={deleting ? 'invisible' : undefined}>Delete</span>
              {deleting ? (
                <span className="absolute inset-0 flex items-center justify-center">
                  <Spinner
                    color="current"
                    size="sm"
                  />
                  <span className="sr-only">Deleting</span>
                </span>
              ) : null}
            </Button>
          </AlertDialog.Footer>
        </AlertDialog.Dialog>
      </AlertDialog.Container>
    </AlertDialog.Backdrop>
  );
}

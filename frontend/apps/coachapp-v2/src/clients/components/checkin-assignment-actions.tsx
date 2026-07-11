import {AlertDialog, Button, Typography, toast, useOverlayState} from '@heroui/react';

import DateInput from '@/@components/date-input';
import {toastMutationError} from '@/@components/mutation-toast';
import {type ClientProfileFormAssignment, useUpdateFormAssignmentMutation} from '@/api/checkins';

const OPEN_STATUSES: ClientProfileFormAssignment['status'][] = ['assigned', 'in_progress'];

export default function CheckinAssignmentActions({assignment}: {assignment: ClientProfileFormAssignment}) {
  const [updateAssignment, {isLoading}] = useUpdateFormAssignmentMutation();
  const dismissConfirm = useOverlayState();

  if (!OPEN_STATUSES.includes(assignment.status)) {
    return null;
  }

  const handleDueDateChange = async (dueDate: null | string) => {
    try {
      await updateAssignment({
        id: assignment.id,
        clientProfileFormAssignmentUpdateRequest: {due_date: dueDate},
      }).unwrap();
      toast.success('Due date updated');
    } catch (error) {
      toastMutationError(error, "Due date wasn't updated. Try again.");
    }
  };

  const handleDismiss = async () => {
    try {
      await updateAssignment({
        id: assignment.id,
        clientProfileFormAssignmentUpdateRequest: {status: 'dismissed'},
      }).unwrap();
      dismissConfirm.close();
      toast.success('Check-in dismissed');
    } catch (error) {
      dismissConfirm.close();
      toastMutationError(error, "Check-in wasn't dismissed. Try again.");
    }
  };

  return (
    <>
      <div className="mt-4 flex flex-col gap-3 border-accent/20 border-t pt-4 sm:flex-row sm:items-end">
        <div className="w-full sm:max-w-56">
          <DateInput
            ariaLabel="Check-in due date"
            label="Due date"
            labelClassName="mb-1.5 block text-xs font-semibold text-muted"
            onChange={handleDueDateChange}
            value={assignment.due_date}
          />
        </div>
        <Button
          className="min-h-11 sm:ml-auto"
          isDisabled={isLoading}
          onPress={dismissConfirm.open}
          variant="ghost"
        >
          Dismiss check-in
        </Button>
      </div>

      <AlertDialog.Backdrop
        isDismissable={!isLoading}
        isOpen={dismissConfirm.isOpen}
        onOpenChange={dismissConfirm.setOpen}
      >
        <AlertDialog.Container>
          <AlertDialog.Dialog className="sm:max-w-100">
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>Dismiss this check-in?</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <Typography>The client will no longer see this assignment as an open check-in.</Typography>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button
                isDisabled={isLoading}
                slot="close"
                variant="tertiary"
              >
                Keep check-in
              </Button>
              <Button
                isPending={isLoading}
                onPress={handleDismiss}
                variant="danger"
              >
                {isLoading ? 'Dismissing' : 'Dismiss'}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </>
  );
}

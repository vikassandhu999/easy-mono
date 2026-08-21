import {AlertDialog, Button, Typography} from '@heroui/react';
import type {ReactNode} from 'react';

type LibraryDeleteDialogProps = {
  inUse: boolean;
  isPending: boolean;
  itemName: string;
  label: 'Food' | 'Recipe';
  onDelete: () => void;
  trigger: ReactNode;
};

export function LibraryDeleteDialog({inUse, isPending, itemName, label, onDelete, trigger}: LibraryDeleteDialogProps) {
  const noun = label.toLowerCase();
  const usage = label === 'Food' ? 'a recipe or plan' : 'a plan';

  return (
    <AlertDialog>
      {trigger}
      <AlertDialog.Backdrop variant="transparent">
        <AlertDialog.Container>
          <AlertDialog.Dialog>
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>{inUse ? `${label} is in use` : `Delete ${noun}?`}</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <Typography>
                {inUse ? (
                  <>
                    <strong>{itemName}</strong> is used by {usage}. Remove it there before deleting.
                  </>
                ) : (
                  <>
                    This will permanently delete <strong>{itemName}</strong>. This action cannot be undone.
                  </>
                )}
              </Typography>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button
                slot="close"
                variant="tertiary"
              >
                {inUse ? 'Close' : 'Cancel'}
              </Button>
              {!inUse && (
                <Button
                  isPending={isPending}
                  onPress={onDelete}
                  variant="danger"
                >
                  {isPending ? 'Deleting' : 'Delete'}
                </Button>
              )}
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}

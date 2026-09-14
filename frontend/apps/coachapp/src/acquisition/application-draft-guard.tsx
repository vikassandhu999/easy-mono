import {useCallback} from 'react';
import {useBeforeUnload, useBlocker} from 'react-router-dom';
import {Button} from '../ui/button';
import {Dialog, DialogHeader, DialogTitle} from '../ui/dialog';

export function ApplicationDraftGuard({dirty, pending}: {dirty: boolean; pending: boolean}) {
  const blocker = useBlocker(dirty || pending);
  useBeforeUnload(
    useCallback(
      (event) => {
        if (dirty || pending) {
          event.preventDefault();
          event.returnValue = '';
        }
      },
      [dirty, pending],
    ),
  );
  return (
    <Dialog
      isOpen={blocker.state === 'blocked'}
      onOpenChange={(open) => {
        if (!open && blocker.state === 'blocked') {
          blocker.reset();
        }
      }}
    >
      <DialogHeader>
        <DialogTitle>Leave your changes?</DialogTitle>
      </DialogHeader>
      <div className="dialog-body space-y-5">
        <p>
          {pending
            ? 'Your request is still being processed. Keep this page open until it is confirmed.'
            : 'Your changes have not been saved.'}
        </p>
        <div className="flex flex-wrap gap-3">
          <Button
            onPress={() => {
              if (blocker.state === 'blocked') {
                blocker.reset();
              }
            }}
          >
            Keep editing
          </Button>
          <Button
            variant="outline"
            isDisabled={pending}
            onPress={() => {
              if (blocker.state === 'blocked') {
                blocker.proceed();
              }
            }}
          >
            Discard and leave
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

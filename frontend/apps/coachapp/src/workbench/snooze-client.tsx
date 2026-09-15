import {formatDateLong} from '@easy/utils';
import {useForm} from 'react-hook-form';
import {useSnoozeClient, type WorkbenchSnooze} from '../api/workbench';
import {Button} from '../ui/button';
import {Dialog, DialogHeader, DialogTitle} from '../ui/dialog';
import {FormError} from '../ui/form-error';
import {setFormError} from '../ui/form-errors';
import {FormField} from '../ui/form-field';

export type SnoozeTarget = {clientId: string; name: string; queue: WorkbenchSnooze['queue']};
export function SnoozeClient({
  target,
  onClose,
  onSaved,
}: {
  target: SnoozeTarget;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const form = useForm<Pick<WorkbenchSnooze, 'snoozed_until'>>({defaultValues: {snoozed_until: ''}});
  const save = useSnoozeClient(target.clientId);
  const pending = form.formState.isSubmitting;
  return (
    <Dialog
      isOpen
      onOpenChange={(open) => {
        if (!open && !pending) {
          onClose();
        }
      }}
      isDismissable={!pending}
      showCloseButton={!pending}
    >
      <DialogHeader>
        <DialogTitle>Snooze this task</DialogTitle>
      </DialogHeader>
      <form
        className="dialog-body space-y-5"
        noValidate
        onSubmit={form.handleSubmit(async (values) => {
          form.clearErrors();
          try {
            await save.mutateAsync({...values, queue: target.queue});
            onSaved(`${target.name}'s task is snoozed through ${formatDateLong(values.snoozed_until)}.`);
          } catch (error) {
            setFormError(
              error,
              'Could not confirm the snooze. Your chosen date is still here; try again.',
              form.setError,
              ['snoozed_until'],
            );
          }
        })}
      >
        <p className="font-semibold">{target.name}</p>
        <p className="text-sm text-muted-foreground">
          Hide this {target.queue === 'quiet' ? 'missed check-in' : 'engagement'} task through the selected date. It can
          return afterward if it still needs attention. Client access and other queues stay unchanged.
        </p>
        <FormField
          control={form.control}
          name="snoozed_until"
          label="Hide through"
          type="date"
          isRequired
          isDisabled={pending}
          rules={{
            validate: (value) =>
              // Workbench snoozes currently expire against the server's UTC date.
              value >= new Date().toISOString().slice(0, 10) || 'Choose today or a later date.',
          }}
        />
        <FormError message={form.formState.errors.root?.message} />
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            isDisabled={pending}
            onPress={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isPending={pending}
          >
            Snooze task
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

import {useCallback, useEffect, useRef, useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {useBeforeUnload, useBlocker} from 'react-router-dom';
import {ApiError, errorMessage} from '../api/client';
import type {Client} from '../api/clients';
import {type FormAssignment, useClientIntake, useSendIntakeReminder, useUpdateIntake} from '../api/forms';
import {Button} from '../ui/button';
import {Dialog, DialogHeader, DialogTitle} from '../ui/dialog';
import {FormError} from '../ui/form-error';
import {FormField} from '../ui/form-field';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';

export function IntakeFollowUp({
  assignment,
  person,
  disabled,
}: {
  assignment: FormAssignment;
  person: Client;
  disabled: boolean;
}) {
  const [action, setAction] = useState<'manage' | 'dismiss' | 'reopen' | 'remind' | null>(null);
  const [notice, setNotice] = useState('');
  const dismissed = assignment.status === 'dismissed';
  const active = person.status === 'active';
  return (
    <div className="mt-5 space-y-4">
      <p className="text-sm text-muted-foreground">
        {assignment.priority === 'high' ? 'High priority' : 'Normal priority'}
        {assignment.due_date ? (
          <>
            {' '}
            · Due{' '}
            <time dateTime={assignment.due_date}>
              {new Date(`${assignment.due_date}T12:00:00`).toLocaleDateString(undefined, {dateStyle: 'medium'})}
            </time>
          </>
        ) : (
          ' · No due date'
        )}
      </p>
      {notice && (
        <p
          role="status"
          className="text-sm"
        >
          {notice}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        {active && person.joined_at && !dismissed && (
          <Button
            isDisabled={disabled || !person.email}
            onPress={() => {
              setNotice('');
              setAction('remind');
            }}
          >
            Send intake reminder
          </Button>
        )}
        {dismissed ? (
          <Button
            variant="outline"
            isDisabled={disabled || !active}
            onPress={() => {
              setNotice('');
              setAction('reopen');
            }}
          >
            Reopen intake
          </Button>
        ) : (
          <Button
            variant="outline"
            isDisabled={disabled || !active}
            onPress={() => {
              setNotice('');
              setAction('manage');
            }}
          >
            Manage intake
          </Button>
        )}
      </div>
      {active && person.joined_at && !dismissed && !person.email && (
        <p className="text-sm text-muted-foreground">Add an email in Client details to send an intake reminder.</p>
      )}
      {action && (
        <IntakeAction
          key={action}
          action={action}
          assignment={assignment}
          person={person}
          onClose={() => setAction(null)}
          onDismiss={() => setAction('dismiss')}
          onSaved={(message) => {
            setAction(null);
            setNotice(message);
          }}
        />
      )}
    </div>
  );
}

function IntakeAction({
  action,
  assignment,
  person,
  onClose,
  onDismiss,
  onSaved,
}: {
  action: 'manage' | 'dismiss' | 'reopen' | 'remind';
  assignment: FormAssignment;
  person: Client;
  onClose: () => void;
  onDismiss: () => void;
  onSaved: (message: string) => void;
}) {
  const update = useUpdateIntake(person.id);
  const reminder = useSendIntakeReminder();
  const intake = useClientIntake(person.id);
  const form = useForm<{priority: FormAssignment['priority']; due_date: string}>({
    defaultValues: {priority: assignment.priority, due_date: assignment.due_date ?? ''},
  });
  const [discard, setDiscard] = useState(false);
  const [dismissAfterDiscard, setDismissAfterDiscard] = useState(false);
  const pending = update.isPending || reminder.isPending;
  const dirty = form.formState.isDirty;
  const completed = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const blocker = useBlocker(useCallback(() => (dirty || pending) && !completed.current, [dirty, pending]));
  useBeforeUnload(
    useCallback(
      (event) => {
        if ((dirty || pending) && !completed.current) {
          event.preventDefault();
          event.returnValue = '';
        }
      },
      [dirty, pending],
    ),
  );
  const error = update.error ?? reminder.error;
  const stale = error instanceof ApiError && error.code === 'assignment_changed';
  const uncertain = reminder.isError && (!(reminder.error instanceof ApiError) || reminder.error.status >= 500);
  const close = () => {
    if (pending) {
      return;
    }
    if (dirty) {
      setDiscard(true);
    } else {
      onClose();
    }
  };
  const save = async () => {
    try {
      if (action === 'remind') {
        await reminder.mutateAsync(assignment.id);
      } else {
        await update.mutateAsync({
          assignment,
          body:
            action === 'manage'
              ? {priority: form.getValues('priority'), due_date: form.getValues('due_date') || null}
              : {status: action === 'dismiss' ? 'dismissed' : 'assigned'},
        });
      }
      if (mounted.current) {
        completed.current = true;
        onSaved(
          action === 'remind'
            ? 'Intake reminder requested.'
            : action === 'dismiss'
              ? 'Intake dismissed.'
              : action === 'reopen'
                ? 'Intake reopened for your client.'
                : 'Intake details saved.',
        );
      }
    } catch {
      /* Keep the reviewed action and draft for recovery. */
    }
  };
  const title =
    action === 'manage'
      ? 'Manage intake'
      : action === 'dismiss'
        ? 'Dismiss this intake?'
        : action === 'reopen'
          ? 'Reopen this intake?'
          : 'Send intake reminder?';
  return (
    <>
      <Dialog
        isOpen
        isDismissable={!pending}
        isKeyboardDismissDisabled={pending}
        showCloseButton={!pending}
        onOpenChange={(open) => {
          if (!open) {
            close();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form
          className="dialog-body space-y-5"
          noValidate
          onSubmit={form.handleSubmit(save)}
        >
          <p className="font-semibold break-words">{assignment.form_template.name}</p>
          {action === 'manage' ? (
            <>
              <FormField
                control={form.control}
                name="due_date"
                type="date"
                label="Intake due date"
                description="Leave blank when there is no deadline."
                isDisabled={pending}
              />
              <div className="grid gap-2">
                <label
                  id="intake-priority-label"
                  htmlFor="intake-priority"
                  className="text-sm font-medium"
                >
                  Intake priority
                </label>
                <Controller
                  control={form.control}
                  name="priority"
                  render={({field}) => (
                    <SelectField
                      id="intake-priority"
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      triggerRef={field.ref}
                      isDisabled={pending}
                    >
                      <SelectItem id="normal">Normal</SelectItem>
                      <SelectItem id="high">High</SelectItem>
                    </SelectField>
                  )}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Use high priority when completing this intake is urgent. Changing these details does not send a
                reminder.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {action === 'remind' ? (
                <>
                  Request an email reminder to <strong className="break-all">{person.email}</strong> with a link to this
                  intake.
                </>
              ) : action === 'dismiss' ? (
                'Remove this intake from outstanding work. Your client will be unable to submit it until you reopen it. No answers are recorded by dismissing it.'
              ) : (
                'Make this intake available to your client again. Its questions, priority and due date stay the same.'
              )}
            </p>
          )}
          {error && (
            <FormError
              message={
                stale
                  ? 'Your client’s intake changed. Refresh to review its new status. Your unsaved changes will be discarded.'
                  : uncertain
                    ? 'We could not confirm the reminder request. The email may already have been sent. Check with your client before choosing to send another.'
                    : errorMessage(error, 'Could not save this change. Your details are still here.')
              }
            />
          )}
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              isDisabled={pending}
              onPress={close}
            >
              {uncertain ? 'Close reminder' : 'Cancel'}
            </Button>
            {stale ? (
              <Button
                isPending={intake.isFetching}
                onPress={async () => {
                  const result = await intake.refetch();
                  if (!result.isError) {
                    completed.current = true;
                    onClose();
                  }
                }}
              >
                Refresh intake
              </Button>
            ) : (
              <Button
                type="submit"
                isPending={pending}
              >
                {action === 'manage'
                  ? 'Save intake details'
                  : action === 'dismiss'
                    ? 'Dismiss intake'
                    : action === 'reopen'
                      ? 'Reopen intake'
                      : uncertain
                        ? 'Send another reminder'
                        : 'Send reminder'}
              </Button>
            )}
          </div>
          {stale && intake.isError && <FormError message="Could not refresh the intake. Try again when connected." />}
          {action === 'manage' && (
            <div className="border-t border-border pt-5">
              <Button
                variant="ghost"
                isDisabled={pending}
                onPress={() => {
                  if (dirty) {
                    setDismissAfterDiscard(true);
                    setDiscard(true);
                  } else {
                    onDismiss();
                  }
                }}
              >
                Dismiss intake instead
              </Button>
            </div>
          )}
        </form>
      </Dialog>
      <Dialog
        isOpen={discard || blocker.state === 'blocked'}
        onOpenChange={(open) => {
          if (!open) {
            setDiscard(false);
            setDismissAfterDiscard(false);
            if (blocker.state === 'blocked') {
              blocker.reset();
            }
          }
        }}
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle>{pending ? 'Saving intake change' : 'Discard intake changes?'}</DialogTitle>
        </DialogHeader>
        <div className="dialog-body space-y-5">
          <p>
            {pending
              ? 'Wait for this request to finish before leaving.'
              : 'Your unsaved due date and priority changes will be lost.'}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              onPress={() => {
                setDiscard(false);
                setDismissAfterDiscard(false);
                if (blocker.state === 'blocked') {
                  blocker.reset();
                }
              }}
            >
              {pending ? 'Stay here' : 'Keep editing'}
            </Button>
            {!pending && (
              <Button
                variant="outline"
                onPress={() => {
                  completed.current = true;
                  if (blocker.state === 'blocked') {
                    blocker.proceed();
                  } else if (dismissAfterDiscard) {
                    onDismiss();
                  } else {
                    onClose();
                  }
                }}
              >
                Discard changes
              </Button>
            )}
          </div>
        </div>
      </Dialog>
    </>
  );
}

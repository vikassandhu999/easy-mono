import {useEffect, useRef, useState} from 'react';
import {useForm} from 'react-hook-form';
import {ApiError, errorMessage} from '../api/client';
import {type Exercise, useCopyExercise, useDeleteExercise, useExercises} from '../api/exercises';
import {Button} from '../ui/button';
import {Dialog, DialogHeader, DialogTitle} from '../ui/dialog';
import {FormError} from '../ui/form-error';
import {setFormError} from '../ui/form-errors';
import {FormField} from '../ui/form-field';
import {InfiniteList} from '../ui/infinite-list';

export function ExerciseAction({
  action,
  exercise,
  onClose,
  onBusy,
  onCopied,
  onDeleted,
}: {
  action: 'copy' | 'delete';
  exercise: Exercise;
  onClose: () => void;
  onBusy: (busy: boolean) => void;
  onCopied: (exercise: Exercise) => void;
  onDeleted: () => void;
}) {
  const copy = useCopyExercise();
  const remove = useDeleteExercise();
  const form = useForm({defaultValues: {name: `${exercise.name.slice(0, 248)} (copy)`}});
  const [uncertain, setUncertain] = useState(false);
  const mounted = useRef(true);
  const errorRef = useRef<HTMLDivElement>(null);
  const pending = form.formState.isSubmitting;
  const inUse = remove.error instanceof ApiError && remove.error.code === 'in_use';
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (!pending && form.formState.errors.name) {
      form.setFocus('name');
    } else if (!pending && (form.formState.errors.root || remove.isError)) {
      errorRef.current?.focus();
    }
  }, [pending, form.formState.errors, form.setFocus, remove.isError]);
  return (
    <Dialog
      isOpen
      isDismissable={!pending}
      isKeyboardDismissDisabled={pending}
      showCloseButton={!pending}
      onOpenChange={(open) => {
        if (!open && !pending) {
          onClose();
        }
      }}
    >
      <DialogHeader>
        <DialogTitle>{action === 'copy' ? 'Copy exercise' : 'Delete exercise?'}</DialogTitle>
      </DialogHeader>
      <form
        noValidate
        className="dialog-body space-y-5"
        onSubmit={form.handleSubmit(async ({name}) => {
          if (pending || uncertain) {
            return;
          }
          form.clearErrors();
          onBusy(true);
          try {
            if (action === 'copy') {
              const result = await copy.mutateAsync({id: exercise.id, name: name.trim()});
              if (mounted.current) {
                onCopied(result.data);
              }
            } else {
              await remove.mutateAsync(exercise.id);
              if (mounted.current) {
                onDeleted();
              }
            }
          } catch (error) {
            if (mounted.current && action === 'copy') {
              if (!(error instanceof ApiError) || error.status >= 500) {
                setUncertain(true);
                form.setError('root', {
                  message: 'The copy could not be confirmed. Check saved exercises below before trying again.',
                });
              } else {
                setFormError(error, 'Could not copy this exercise. Try again.', form.setError, ['name']);
              }
            }
          } finally {
            if (mounted.current) {
              onBusy(false);
            }
          }
        })}
      >
        <p className="break-words font-semibold">{exercise.name}</p>
        {action === 'copy' ? (
          <>
            <p className="text-sm text-muted-foreground">
              Start from its saved details, then customize your independent copy. Plans using the original stay the
              same.
            </p>
            <FormField
              control={form.control}
              name="name"
              label="Name for the copy"
              isRequired
              isDisabled={pending || uncertain}
              maxLength={255}
              rules={{validate: (name) => Boolean(name.trim()) || 'Enter a name for the copy.'}}
            />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            This permanently removes the exercise from your library. Exercises used in planned workouts cannot be
            deleted. Logged workout history is kept.
          </p>
        )}
        <div
          ref={errorRef}
          tabIndex={-1}
        >
          <FormError message={form.formState.errors.root?.message} />
          {remove.isError && (
            <FormError
              message={
                inUse
                  ? 'A training plan still uses this exercise. Remove or replace it in those workouts before deleting it.'
                  : errorMessage(
                      remove.error,
                      'Deletion could not be confirmed. Try again to check and remove this exercise.',
                    )
              }
            />
          )}
        </div>
        {uncertain && (
          <CopyRecovery
            name={form.getValues('name')}
            onUse={onCopied}
            onRetry={() => {
              setUncertain(false);
              form.clearErrors();
              form.setFocus('name');
            }}
          />
        )}
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            isDisabled={pending}
            onPress={onClose}
          >
            Cancel
          </Button>
          {!uncertain && (
            <Button
              type="submit"
              variant={action === 'delete' ? 'destructive' : 'default'}
              isPending={pending}
              isDisabled={inUse}
            >
              {action === 'copy' ? 'Create copy' : 'Delete exercise'}
            </Button>
          )}
        </div>
      </form>
    </Dialog>
  );
}

function CopyRecovery({
  name,
  onUse,
  onRetry,
}: {
  name: string;
  onUse: (exercise: Exercise) => void;
  onRetry: () => void;
}) {
  const query = useExercises(name.trim());
  return (
    <div className="space-y-4">
      <InfiniteList
        query={query}
        label="matching exercises"
        singular="matching exercise"
        empty={<p>No matching exercises found.</p>}
      >
        {(exercise) => (
          <div className="space-y-2 p-4">
            <p className="break-words font-semibold">{exercise.name}</p>
            <p className="text-sm text-muted-foreground">
              {exercise.instructions ?? 'Open to review its saved details.'}
            </p>
            <Button
              variant="outline"
              onPress={() => onUse(exercise)}
            >
              Open saved exercise
            </Button>
          </div>
        )}
      </InfiniteList>
      {query.isSuccess && !query.isFetching && !query.hasNextPage && (
        <>
          <p className="text-sm text-muted-foreground">
            If none matches your attempt, choose a name and create a separate copy.
          </p>
          <Button
            variant="outline"
            onPress={onRetry}
          >
            Create a separate copy
          </Button>
        </>
      )}
    </div>
  );
}

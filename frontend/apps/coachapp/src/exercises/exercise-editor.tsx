import {useCallback, useEffect, useRef, useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {generatePath, useBeforeUnload, useBlocker, useNavigate, useParams} from 'react-router-dom';
import {ApiError, errorMessage} from '../api/client';
import {type Exercise, useExercise, useExercises, useSaveExercise} from '../api/exercises';
import {routes} from '../routes';
import {Button} from '../ui/button';
import {Dialog, DialogHeader, DialogTitle} from '../ui/dialog';
import {FormError} from '../ui/form-error';
import {setFormError} from '../ui/form-errors';
import {FormField} from '../ui/form-field';
import {InfiniteList} from '../ui/infinite-list';
import {useListLocation} from '../ui/list-location';
import {FormActions, Page, PageHeader, Surface} from '../ui/page';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';
import {body, changes, fields} from './exercise';
import {ExerciseAction} from './exercise-action';
import {ExerciseMedia} from './exercise-media';
import {ExerciseRelations} from './exercise-relations';

export function ExerciseEditor() {
  const {id} = useParams();
  return id ? (
    <LoadEditor
      key={id}
      id={id}
    />
  ) : (
    <Editor
      key="new"
      initial={undefined}
    />
  );
}
function LoadEditor({id}: {id: string}) {
  const query = useExercise(id);
  const [initial, setInitial] = useState<Exercise>();
  const {to, state} = useListLocation(routes.exercises);
  useEffect(() => {
    if (!initial && query.isSuccess && query.isFetchedAfterMount) {
      setInitial(query.data.data);
    }
  }, [initial, query.data, query.isSuccess, query.isFetchedAfterMount]);
  if (initial) {
    return <Editor initial={initial} />;
  }
  return (
    <Page>
      <PageHeader
        title="Exercise"
        back={{to, label: 'Back to exercises', state}}
      />
      <Surface>
        {query.isError ? (
          <div className="space-y-3">
            <FormError message={errorMessage(query.error, 'Could not load this exercise.')} />
            <Button
              isPending={query.isFetching}
              onPress={() => {
                query.refetch();
              }}
            >
              Try again
            </Button>
          </div>
        ) : (
          <p role="status">Loading exercise…</p>
        )}
      </Surface>
    </Page>
  );
}
function Editor({initial}: {initial: Exercise | undefined}) {
  const [exercise, setExercise] = useState(initial);
  const form = useForm({defaultValues: fields(initial)});
  const save = useSaveExercise();
  const query = useExercise(exercise?.id ?? '');
  const [uncertain, setUncertain] = useState(false);
  const [checking, setChecking] = useState(false);
  const [reload, setReload] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [notice, setNotice] = useState('');
  const [action, setAction] = useState<'copy' | 'delete' | null>(null);
  const [managing, setManaging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const mounted = useRef(true);
  const leaving = useRef(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const navigate = useNavigate();
  const {to, state} = useListLocation(routes.exercises);
  const dirty = form.formState.isDirty;
  const pending = form.formState.isSubmitting || reloading || managing || uploading;
  const readOnly = exercise?.source === 'system';
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (pending) {
      return;
    }
    if (form.formState.errors.root) {
      errorRef.current?.focus();
      errorRef.current?.scrollIntoView({block: 'center'});
      return;
    }
    const field = (['name', 'instructions', 'description', 'mechanics', 'force'] as const).find(
      (name) => form.formState.errors[name],
    );
    if (field) {
      if (field !== 'name' && field !== 'instructions' && detailsRef.current) {
        detailsRef.current.open = true;
      }
      form.setFocus(field);
    }
  }, [form.formState.errors, form.setFocus, pending]);
  const blocker = useBlocker(
    useCallback(
      ({currentLocation, nextLocation}) =>
        !leaving.current && (dirty || pending) && currentLocation.pathname !== nextLocation.pathname,
      [dirty, pending],
    ),
  );
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
  function resetExercise(saved: Exercise) {
    setExercise(saved);
    form.reset(fields(saved));
    setUncertain(false);
    setChecking(false);
  }
  return (
    <Page>
      <PageHeader
        title={initial ? (readOnly ? 'Exercise details' : 'Edit exercise') : 'Create exercise'}
        description={
          initial
            ? readOnly
              ? 'This shared exercise is read-only.'
              : 'Changes update this library exercise wherever it is used in training plans.'
            : 'Name the movement and explain how you want clients to perform it.'
        }
        back={{to, label: 'Back to exercises', state}}
        actions={
          exercise && (
            <Button
              variant="outline"
              isDisabled={dirty || pending || query.isError}
              onPress={() => setAction('copy')}
            >
              Copy exercise
            </Button>
          )
        }
      />
      {exercise && dirty && (
        <p className="text-sm text-muted-foreground">Save your changes before copying or deleting this exercise.</p>
      )}
      {exercise && query.isError && (
        <div className="space-y-3">
          <FormError message="Could not refresh this exercise. Your edits are still here. Retry before copying or deleting it." />
          <Button
            variant="outline"
            isPending={query.isFetching}
            onPress={() => {
              query.refetch();
            }}
          >
            Retry exercise
          </Button>
        </div>
      )}
      <form
        noValidate
        className="has-mobile-actions min-w-0 space-y-6"
        onSubmit={form.handleSubmit(async (values) => {
          if (readOnly || uncertain || pending) {
            return;
          }
          form.clearErrors();
          setNotice('');
          try {
            const input = body(values);
            const result = await save.mutateAsync(
              exercise
                ? {kind: 'update', id: exercise.id, body: changes(values, exercise)}
                : {kind: 'create', body: input},
            );
            if (!mounted.current) {
              return;
            }
            resetExercise(result.data);
            setNotice('Exercise saved.');
            if (!initial) {
              leaving.current = true;
              navigate(generatePath(routes.exercise, {id: result.data.id}), {replace: true, state});
            }
          } catch (error) {
            if (!mounted.current) {
              return;
            }
            const unknownCreate = !exercise && (!(error instanceof ApiError) || error.status >= 500);
            setUncertain(unknownCreate);
            if (unknownCreate) {
              form.setError('root', {
                message:
                  'Creation could not be confirmed. Check saved exercises before trying again; your draft is still here.',
              });
            } else {
              setFormError(
                error,
                'The save could not be confirmed. Your edits are still here. Check the saved version before retrying.',
                form.setError,
                ['name', 'description', 'instructions', 'mechanics', 'force'],
              );
            }
          }
        })}
      >
        <fieldset
          disabled={pending || readOnly}
          className="min-w-0 space-y-6"
        >
          <legend className="sr-only">Exercise information</legend>
          <FormField
            control={form.control}
            name="name"
            label="Exercise name"
            isRequired
            maxLength={255}
            rules={{validate: (value) => Boolean(String(value).trim()) || 'Enter an exercise name.'}}
          />
          <FormField
            control={form.control}
            name="instructions"
            label="Coaching instructions"
            description="Explain the setup, movement and the cues that matter."
            multiline
            maxLength={10000}
          />
        </fieldset>
        <ExerciseMedia
          media={form.watch('media')}
          images={form.watch('images')}
          disabled={pending || readOnly}
          readOnly={readOnly}
          onBusy={setUploading}
          onChange={(value) => form.setValue('media', value, {shouldDirty: true})}
          onImagesChange={(value) => form.setValue('images', value, {shouldDirty: true})}
        />
        <fieldset
          disabled={pending || readOnly}
          className="min-w-0"
        >
          <legend className="sr-only">Additional exercise details</legend>
          <details ref={detailsRef}>
            <summary className="w-fit cursor-pointer py-2 font-medium">Equipment, muscles and other details</summary>
            <div className="mt-4 space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <ExerciseRelations
                  kind="equipment"
                  value={form.watch('equipment')}
                  disabled={pending || readOnly}
                  onChange={(value) => form.setValue('equipment', value, {shouldDirty: true})}
                />
                <ExerciseRelations
                  kind="muscles"
                  value={form.watch('muscles')}
                  disabled={pending || readOnly}
                  onChange={(value) => form.setValue('muscles', value, {shouldDirty: true})}
                />
              </div>
              <FormField
                control={form.control}
                name="description"
                label="Short description"
                description="Help distinguish this exercise from similar movements."
                multiline
                maxLength={5000}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Controller
                  control={form.control}
                  name="mechanics"
                  render={({field}) => (
                    <div className="grid gap-2">
                      <span
                        id="mechanics-label"
                        className="text-sm font-medium"
                      >
                        Movement type
                      </span>
                      <SelectField
                        id="mechanics"
                        value={field.value ?? 'none'}
                        isDisabled={pending || readOnly}
                        triggerRef={field.ref}
                        onBlur={field.onBlur}
                        onChange={(value) => {
                          if (value === 'compound' || value === 'isolation' || value === 'isometric') {
                            field.onChange(value);
                          } else if (value === 'none') {
                            field.onChange(null);
                          }
                        }}
                      >
                        <SelectItem id="none">Not specified</SelectItem>
                        <SelectItem id="compound">Compound</SelectItem>
                        <SelectItem id="isolation">Isolation</SelectItem>
                        <SelectItem id="isometric">Isometric</SelectItem>
                      </SelectField>
                    </div>
                  )}
                />
                <Controller
                  control={form.control}
                  name="force"
                  render={({field}) => (
                    <div className="grid gap-2">
                      <span
                        id="force-label"
                        className="text-sm font-medium"
                      >
                        Force
                      </span>
                      <SelectField
                        id="force"
                        value={field.value ?? 'none'}
                        isDisabled={pending || readOnly}
                        triggerRef={field.ref}
                        onBlur={field.onBlur}
                        onChange={(value) => {
                          if (value === 'push' || value === 'pull' || value === 'static') {
                            field.onChange(value);
                          } else if (value === 'none') {
                            field.onChange(null);
                          }
                        }}
                      >
                        <SelectItem id="none">Not specified</SelectItem>
                        <SelectItem id="push">Push</SelectItem>
                        <SelectItem id="pull">Pull</SelectItem>
                        <SelectItem id="static">Static</SelectItem>
                      </SelectField>
                    </div>
                  )}
                />
              </div>
            </div>
          </details>
        </fieldset>
        <div
          ref={errorRef}
          tabIndex={-1}
          className="space-y-3"
        >
          <FormError message={form.formState.errors.root?.message} />
          {form.formState.errors.root && exercise && (
            <Button
              variant="outline"
              isDisabled={pending}
              onPress={() => setReload(true)}
            >
              Review saved version
            </Button>
          )}
          {uncertain && (
            <Button
              variant="outline"
              onPress={() => setChecking(true)}
            >
              Check saved exercises
            </Button>
          )}
        </div>
        {notice && !dirty && <p role="status">{notice}</p>}
        {!readOnly && (
          <p
            role="status"
            className="text-xs text-muted-foreground"
          >
            {dirty ? 'Unsaved changes' : exercise ? 'All changes saved' : 'New exercise'}
          </p>
        )}
        {exercise && !readOnly && (
          <details>
            <summary className="w-fit cursor-pointer py-2 text-sm text-muted-foreground">Remove from library</summary>
            <div className="mt-3 space-y-3">
              <p className="text-sm text-muted-foreground">Only exercises unused by training plans can be deleted.</p>
              <Button
                variant="destructive"
                isDisabled={dirty || pending || query.isError}
                onPress={() => setAction('delete')}
              >
                Delete exercise
              </Button>
            </div>
          </details>
        )}
        <FormActions>
          <Button
            variant="ghost"
            isDisabled={pending}
            onPress={() => navigate(to, {state})}
          >
            Back to exercises
          </Button>
          {!readOnly && (
            <Button
              type="submit"
              isPending={pending}
              isDisabled={!dirty || uncertain}
            >
              Save exercise
            </Button>
          )}
        </FormActions>
      </form>
      {exercise && action && (
        <ExerciseAction
          action={action}
          exercise={exercise}
          onClose={() => setAction(null)}
          onBusy={setManaging}
          onCopied={(saved) => {
            setAction(null);
            setManaging(false);
            if (saved.id === exercise.id) {
              resetExercise(saved);
              return;
            }
            leaving.current = true;
            navigate(generatePath(routes.exercise, {id: saved.id}), {state});
          }}
          onDeleted={() => {
            leaving.current = true;
            navigate(to, {replace: true, state: {...state, deleted: exercise.name}});
          }}
        />
      )}
      {checking && (
        <CreationRecovery
          name={form.getValues('name')}
          onClose={() => setChecking(false)}
          onUse={(saved) => {
            leaving.current = true;
            navigate(generatePath(routes.exercise, {id: saved.id}), {replace: true, state});
          }}
          onRetry={() => {
            setChecking(false);
            setUncertain(false);
            form.clearErrors('root');
          }}
        />
      )}
      <Dialog
        isOpen={reload}
        isDismissable={!reloading}
        showCloseButton={!reloading}
        onOpenChange={(open) => {
          if (!reloading) {
            setReload(open);
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Load saved exercise?</DialogTitle>
        </DialogHeader>
        <div className="dialog-body space-y-4">
          <p>This replaces your unsaved edits with the saved exercise.</p>
          <div className="flex flex-wrap gap-3">
            <Button
              autoFocus
              variant="outline"
              isDisabled={reloading}
              onPress={() => setReload(false)}
            >
              Keep editing
            </Button>
            <Button
              isPending={reloading}
              onPress={async () => {
                setReloading(true);
                try {
                  const result = await query.refetch();
                  if (result.error) {
                    throw result.error;
                  }
                  if (result.data && mounted.current) {
                    resetExercise(result.data.data);
                    setReload(false);
                    setNotice('Saved version loaded.');
                  }
                } catch (error) {
                  if (mounted.current) {
                    setReload(false);
                    form.setError('root', {
                      message: errorMessage(error, 'Could not load the saved exercise. Your edits are still here.'),
                    });
                  }
                } finally {
                  if (mounted.current) {
                    setReloading(false);
                  }
                }
              }}
            >
              Load saved exercise
            </Button>
          </div>
        </div>
      </Dialog>
      <Dialog
        isOpen={blocker.state === 'blocked'}
        onOpenChange={(open) => {
          if (!open && blocker.state === 'blocked') {
            blocker.reset();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Leave without saving?</DialogTitle>
        </DialogHeader>
        <div className="dialog-body space-y-4">
          <p>Your unsaved changes will be lost.</p>
          <div className="flex flex-wrap gap-3">
            <Button
              autoFocus
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
              Discard changes
            </Button>
          </div>
        </div>
      </Dialog>
    </Page>
  );
}
function CreationRecovery({
  name,
  onUse,
  onClose,
  onRetry,
}: {
  name: string;
  onUse: (exercise: Exercise) => void;
  onClose: () => void;
  onRetry: () => void;
}) {
  const query = useExercises(name.trim());
  return (
    <Dialog
      isOpen
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogHeader>
        <DialogTitle>Check saved exercises</DialogTitle>
      </DialogHeader>
      <div className="dialog-body space-y-4">
        <p>
          Check whether the interrupted save created your exercise. Opening one replaces this draft with its saved
          details.
        </p>
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
                {exercise.description ?? 'Open to review the saved details.'}
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
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              If none matches this attempt, return to your draft and create a separate exercise.
            </p>
            <Button
              variant="outline"
              onPress={onRetry}
            >
              Create a separate exercise
            </Button>
          </div>
        )}
        <Button
          variant="ghost"
          onPress={onClose}
        >
          Return to draft
        </Button>
      </div>
    </Dialog>
  );
}

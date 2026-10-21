import {useEffect, useRef, useState} from 'react';
import {Link, NavLink, useLocation, useNavigate, useSearchParams} from 'react-router-dom';
import {errorMessage} from '../api/client';
import {useCopyWorkout, useDeleteWorkout, useSaveWorkout, useWorkouts, type Workout} from '../api/workouts';
import {Button} from '../ui/button';
import {Dialog, DialogHeader, DialogTitle} from '../ui/dialog';
import {FormError} from '../ui/form-error';
import {InfiniteList} from '../ui/infinite-list';
import {Input} from '../ui/input';
import {ListSearch} from '../ui/list-search';
import {Page, PageHeader, Surface} from '../ui/page';
export function WorkoutLibrary() {
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const query = useWorkouts({search: params.get('search') ?? ''});
  const create = useSaveWorkout();
  const copy = useCopyWorkout();
  const remove = useDeleteWorkout();
  const [dialog, setDialog] = useState<'new' | Workout | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string>();
  const [nameInvalid, setNameInvalid] = useState(false);
  const nameInput = useRef<HTMLInputElement>(null);
  const [copyError, setCopyError] = useState<{id: string; message: string} | null>(null);
  const [notice, setNotice] = useState<{message: string} | null>(null);
  useEffect(() => {
    if (!notice) {
      return;
    }
    const timer = window.setTimeout(() => setNotice(null), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);
  function closeDialog() {
    setDialog(null);
    setError(undefined);
    setNameInvalid(false);
  }
  return (
    <Page>
      <PageHeader
        title="Workout library"
        description="Create a workout, then copy it to a client’s training week."
        actions={
          <Button
            onPress={() => {
              setName('');
              setError(undefined);
              setNameInvalid(false);
              setDialog('new');
            }}
          >
            Create workout
          </Button>
        }
      />
      <nav
        aria-label="Workout library"
        className="flex gap-5"
      >
        <NavLink
          className="app-navigation-link"
          to="/workouts"
          end
        >
          Workouts
        </NavLink>
        <NavLink
          className="app-navigation-link"
          to="/exercises"
        >
          Exercises
        </NavLink>
      </nav>
      <ListSearch label="Search workouts" />
      <InfiniteList
        query={query}
        label="workouts"
        singular="workout"
        empty={
          <Surface>
            <h2 className="section-title">{params.get('search') ? 'No matching workouts' : 'No workouts yet'}</h2>
            <p className="mt-2 text-muted-foreground">Create a workout with exercises, a video or an open session.</p>
          </Surface>
        }
      >
        {(workout) => (
          <div className="flex flex-wrap items-center gap-2 p-4">
            <Link
              to={`/workouts/${workout.id}`}
              state={{listSearch: location.search}}
              className="min-w-0 flex-1"
            >
              <p className="break-words font-semibold">{workout.name}</p>
              <p className="text-sm font-medium text-muted-foreground">
                {workout.type === 'prescribed' ? 'Exercises' : workout.type === 'video' ? 'Video' : 'Open session'}
              </p>
            </Link>
            <div className="flex w-full justify-end gap-3 sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                className="min-w-24"
                isPending={copy.isPending && copy.variables?.id === workout.id}
                isDisabled={copy.isPending}
                onPress={async () => {
                  if (copy.isPending) {
                    return;
                  }
                  setCopyError(null);
                  try {
                    const result = await copy.mutateAsync({id: workout.id, name: `${workout.name} copy`});
                    navigate(`/workouts/${result.data.id}`);
                  } catch (cause) {
                    setCopyError({id: workout.id, message: errorMessage(cause, 'Could not copy this workout.')});
                  }
                }}
              >
                {copy.isPending && copy.variables?.id === workout.id ? 'Copying…' : 'Copy'}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onPress={() => {
                  setError(undefined);
                  setDialog(workout);
                }}
              >
                Delete
              </Button>
            </div>
            {copyError?.id === workout.id && (
              <div className="w-full">
                <FormError message={copyError.message} />
              </div>
            )}
          </div>
        )}
      </InfiniteList>
      {dialog && (
        <Dialog
          isOpen
          onOpenChange={(open) => {
            if (!open) {
              closeDialog();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{dialog === 'new' ? 'Create workout' : `Delete ${dialog.name}?`}</DialogTitle>
          </DialogHeader>
          {dialog === 'new' ? (
            <form
              className="dialog-body space-y-4"
              noValidate
              onSubmit={async (event) => {
                event.preventDefault();
                if (create.isPending) {
                  return;
                }
                setError(undefined);
                if (!name.trim()) {
                  setNameInvalid(true);
                  nameInput.current?.focus();
                  return;
                }
                setNameInvalid(false);
                try {
                  const result = await create.mutateAsync({
                    body: {name: name.trim(), type: 'prescribed', description: null, video_url: null, groups: []},
                  });
                  navigate(`/workouts/${result.data.id}`);
                } catch (cause) {
                  setError(errorMessage(cause, 'Could not create this workout.'));
                }
              }}
            >
              <label
                htmlFor="create-workout-name"
                className="grid gap-1"
              >
                <span className="text-sm font-medium">Workout name</span>
                <Input
                  id="create-workout-name"
                  ref={nameInput}
                  autoFocus
                  required
                  aria-invalid={nameInvalid}
                  aria-describedby={nameInvalid ? 'create-workout-name-error' : undefined}
                  value={name}
                  maxLength={255}
                  onChange={(event) => {
                    setName(event.target.value);
                    if (event.target.value.trim()) {
                      setNameInvalid(false);
                    }
                    setError(undefined);
                  }}
                />
              </label>
              {nameInvalid && (
                <p
                  id="create-workout-name-error"
                  role="alert"
                  className="text-sm text-destructive"
                >
                  Enter a workout name.
                </p>
              )}
              <FormError message={error} />
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onPress={closeDialog}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isPending={create.isPending}
                >
                  Create workout
                </Button>
              </div>
            </form>
          ) : (
            <div className="dialog-body space-y-4">
              <p>This removes the library workout. Copies assigned to clients stay available.</p>
              <FormError message={error} />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onPress={closeDialog}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  isPending={remove.isPending}
                  onPress={async () => {
                    try {
                      await remove.mutateAsync(dialog.id);
                      setNotice({message: `${dialog.name} deleted.`});
                      setDialog(null);
                    } catch (cause) {
                      setError(errorMessage(cause, 'Could not delete this workout.'));
                    }
                  }}
                >
                  Delete workout
                </Button>
              </div>
            </div>
          )}
        </Dialog>
      )}
      <div
        role="status"
        className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4"
      >
        {notice && (
          <p className="max-w-md min-w-0 break-words rounded-xl bg-foreground px-4 py-3 text-sm font-medium text-background shadow-lg">
            {notice.message}
          </p>
        )}
      </div>
    </Page>
  );
}

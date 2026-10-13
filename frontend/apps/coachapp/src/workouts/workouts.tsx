import {useState} from 'react';
import {Link, useLocation, useNavigate, useSearchParams} from 'react-router-dom';
import {errorMessage} from '../api/client';
import {useCopyWorkout, useDeleteWorkout, useSaveWorkout, useWorkouts, type Workout} from '../api/workouts';
import {Button, buttonVariants} from '../ui/button';
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
  const [notice, setNotice] = useState('');
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
              setDialog('new');
            }}
          >
            Create workout
          </Button>
        }
      />
      <ListSearch label="Search workouts" />
      <p role="status">{notice}</p>
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
            <Button
              variant="ghost"
              onPress={async () => {
                try {
                  const result = await copy.mutateAsync({id: workout.id, name: `${workout.name} copy`});
                  navigate(`/workouts/${result.data.id}`);
                } catch (cause) {
                  setError(errorMessage(cause, 'Could not copy this workout.'));
                }
              }}
            >
              Copy
            </Button>
            <Button
              variant="ghost"
              onPress={() => {
                setError(undefined);
                setDialog(workout);
              }}
            >
              Delete
            </Button>
          </div>
        )}
      </InfiniteList>
      <FormError message={error} />
      {dialog && (
        <Dialog
          isOpen
          onOpenChange={(open) => {
            if (!open) {
              setDialog(null);
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{dialog === 'new' ? 'Create workout' : `Delete ${dialog.name}?`}</DialogTitle>
          </DialogHeader>
          {dialog === 'new' ? (
            <form
              className="space-y-4"
              onSubmit={async (event) => {
                event.preventDefault();
                if (create.isPending) {
                  return;
                }
                if (!name.trim()) {
                  setError('Enter a workout name.');
                  return;
                }
                try {
                  const result = await create.mutateAsync({
                    body: {name: name.trim(), type: 'prescribed', description: null, video: null, groups: []},
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
                  autoFocus
                  value={name}
                  maxLength={255}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
              <FormError message={error} />
              <Button
                type="submit"
                isPending={create.isPending}
              >
                Create workout
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <p>This removes the library workout. Copies assigned to clients stay available.</p>
              <FormError message={error} />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onPress={() => setDialog(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  isPending={remove.isPending}
                  onPress={async () => {
                    try {
                      await remove.mutateAsync(dialog.id);
                      setNotice(`${dialog.name} deleted.`);
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
      <Link
        to="/exercises"
        className={buttonVariants({variant: 'outline'})}
      >
        Exercise library
      </Link>
    </Page>
  );
}

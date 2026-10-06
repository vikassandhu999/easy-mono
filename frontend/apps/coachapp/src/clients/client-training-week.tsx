import {addDays, getCurrentWeekRange} from '@easy/utils';
import {useState} from 'react';
import {generatePath, Link} from 'react-router-dom';
import type {Client} from '../api/clients';
import {useExercises} from '../api/exercises';
import {useExerciseHistory, useTrainingOccurrences} from '../api/training-sessions';
import {routes} from '../routes';
import {setValues} from '../training-sessions/session';
import {Button} from '../ui/button';
import {Dialog, DialogHeader, DialogTitle} from '../ui/dialog';
import {FormError} from '../ui/form-error';
import {InfiniteList} from '../ui/infinite-list';
import {Input} from '../ui/input';
import {Surface} from '../ui/page';

export function ClientTrainingWeek({person}: {person: Client}) {
  const [from, setFrom] = useState(() => getCurrentWeekRange(person.local_date).from);
  const query = useTrainingOccurrences(person.id, from, addDays(from, 6).toString());
  const [picking, setPicking] = useState(false);
  const [exercise, setExercise] = useState<{id: string; name: string} | null>(null);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="editor-section-title">This week’s training</h2>
        <Button
          variant="outline"
          onPress={() => setPicking(true)}
        >
          Exercise PRs
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="ghost"
          onPress={() => setFrom(addDays(from, -7).toString())}
        >
          Previous week
        </Button>
        <p>
          {from} – {addDays(from, 6).toString()}
        </p>
        <Button
          variant="ghost"
          onPress={() => setFrom(addDays(from, 7).toString())}
        >
          Next week
        </Button>
      </div>
      {!query.data ? (
        query.isPending ? (
          <p role="status">Loading expected workouts…</p>
        ) : (
          <div className="space-y-3">
            <FormError message="Could not load expected workouts." />
            <Button onPress={() => query.refetch()}>Retry workouts</Button>
          </div>
        )
      ) : (
        <Surface className="space-y-3">
          {query.isError && <FormError message="Could not refresh. Showing the last loaded week." />}
          {query.data.data.length === 0 && <p>No workouts expected this week.</p>}
          <ul className="divide-y divide-border">
            {query.data.data.map((occurrence) => (
              <li
                key={`${occurrence.plan_id}:${occurrence.schedule_entry_id}:${occurrence.occurrence_date}`}
                className="py-3 flex flex-wrap justify-between gap-2"
              >
                <div>
                  <p className="font-medium">{occurrence.workout_name}</p>
                  <p className="text-sm text-muted-foreground">{occurrence.occurrence_date}</p>
                </div>
                {occurrence.session_id ? (
                  <Link
                    className="text-link"
                    to={generatePath(routes.trainingSession, {clientId: person.id, id: occurrence.session_id})}
                  >
                    Done · View session
                  </Link>
                ) : (
                  <p className="text-muted-foreground">Not recorded</p>
                )}
              </li>
            ))}
          </ul>
          {query.data.extra_sessions.map((session) => (
            <p key={session.id}>
              Extra · {session.local_date} ·{' '}
              <Link
                className="text-link"
                to={generatePath(routes.trainingSession, {clientId: person.id, id: session.id})}
              >
                {session.prescription?.name ?? 'Freestyle workout'}
              </Link>
            </p>
          ))}
        </Surface>
      )}
      {picking && (
        <ExerciseChoice
          onClose={() => setPicking(false)}
          onSelect={(value) => {
            setExercise(value);
            setPicking(false);
          }}
        />
      )}
      {exercise && (
        <ExercisePR
          clientId={person.id}
          exercise={exercise}
          onClose={() => setExercise(null)}
        />
      )}
    </div>
  );
}
function ExerciseChoice({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (exercise: {id: string; name: string}) => void;
}) {
  const [search, setSearch] = useState('');
  const query = useExercises(search);
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
        <DialogTitle>Choose an exercise</DialogTitle>
      </DialogHeader>
      <div className="dialog-body space-y-4">
        <label
          htmlFor="pr-exercise-search"
          className="grid gap-2 text-sm"
        >
          Search exercises
          <Input
            id="pr-exercise-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <InfiniteList
          query={query}
          label="exercises"
          singular="exercise"
          empty={<p>No matching exercises.</p>}
        >
          {(exercise) => (
            <Button
              className="w-full justify-start whitespace-normal text-left"
              variant="ghost"
              onPress={() => onSelect(exercise)}
            >
              {exercise.name}
            </Button>
          )}
        </InfiniteList>
      </div>
    </Dialog>
  );
}
function ExercisePR({
  clientId,
  exercise,
  onClose,
}: {
  clientId: string;
  exercise: {id: string; name: string};
  onClose: () => void;
}) {
  const query = useExerciseHistory(clientId, exercise.id);
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
        <DialogTitle>{exercise.name} · PRs</DialogTitle>
      </DialogHeader>
      <div className="dialog-body space-y-4">
        <p className="text-sm text-muted-foreground">
          Best load for each rep count. Only working sets marked done in completed workouts count.
        </p>
        {!query.data ? (
          query.isPending ? (
            <p role="status">Loading records…</p>
          ) : (
            <>
              <FormError message="Could not load exercise history." />
              <Button onPress={() => query.refetch()}>Retry history</Button>
            </>
          )
        ) : (
          <>
            {query.data.data.bests.length === 0 ? (
              <p>No PR recorded.</p>
            ) : (
              <dl className="grid grid-cols-2 gap-3">
                {query.data.data.bests.map((best) => (
                  <div key={best.reps}>
                    <dt>{best.reps} reps</dt>
                    <dd className="font-semibold">{best.best_kg} kg</dd>
                  </div>
                ))}
              </dl>
            )}
            <h3 className="section-title">Set history</h3>
            <ol className="divide-y divide-border">
              {query.data.data.sets.map((set) => (
                <li
                  key={set.id}
                  className="py-3 space-y-1"
                >
                  <p>
                    {set.local_date} · {set.kind} · {set.outcome}
                  </p>
                  <p>{setValues(set)}</p>
                  <Link
                    className="text-link"
                    to={generatePath(routes.trainingSession, {clientId, id: set.session_id})}
                  >
                    View session
                  </Link>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </Dialog>
  );
}

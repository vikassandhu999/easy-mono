import {Link, useLocation, useSearchParams} from 'react-router-dom';
import {useExercises} from '../api/exercises';
import {buttonVariants} from '../ui/button';
import {InfiniteList} from '../ui/infinite-list';
import {ListSearch} from '../ui/list-search';
import {Page, PageHeader, Surface} from '../ui/page';
import {goals, kindLabels, kinds, labelOf, placeLabels, places} from './exercise';
export function Exercises() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const kind = kinds.find((value) => value === params.get('kind'));
  const goal = goals.find((value) => value === params.get('goal'));
  const place = places.find((value) => value === params.get('place'));
  const query = useExercises({
    search: params.get('search') ?? '',
    ...(kind ? {kind} : {}),
    ...(goal ? {goal} : {}),
    ...(place ? {place} : {}),
  });
  const filter = (key: string, value: string) =>
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (value) {
          next.set(key, value);
        } else {
          next.delete(key);
        }
        return next;
      },
      {replace: true},
    );
  return (
    <Page>
      <PageHeader
        title="Exercise library"
        description="Shared exercises and your own exercises. Choose what the client records."
        back={{to: '/workouts', label: 'Workout library'}}
        actions={
          <Link
            to="/exercises/new"
            state={{listSearch: location.search}}
            className={buttonVariants()}
          >
            Create exercise
          </Link>
        }
      />
      <ListSearch label="Search exercises" />
      <div className="grid gap-3 sm:grid-cols-3">
        {(
          [
            {key: 'kind', label: 'Kind', values: kinds},
            {key: 'goal', label: 'Goal', values: goals},
            {key: 'place', label: 'Place', values: places},
          ] as const
        ).map(({key, label, values}) => (
          <label
            key={key}
            className="grid gap-1"
          >
            <span className="text-sm font-medium">{label}</span>
            <select
              className="h-12 rounded-xl border border-input bg-surface px-3"
              value={params.get(key) ?? ''}
              onChange={(event) => filter(key, event.target.value)}
            >
              <option value="">All {label.toLowerCase()}s</option>
              {values.map((value) => (
                <option
                  key={value}
                  value={value}
                >
                  {placeLabels[value] ?? value[0]?.toUpperCase()}
                  {placeLabels[value] ? '' : value.slice(1)}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <InfiniteList
        query={query}
        label="exercises"
        singular="exercise"
        empty={
          <Surface>
            <h2 className="section-title">No matching exercises</h2>
            <p className="mt-2 text-muted-foreground">Try another search or create the exercise you need.</p>
          </Surface>
        }
      >
        {(exercise) => (
          <Link
            to={`/exercises/${exercise.id}`}
            state={{listSearch: location.search}}
            className="block space-y-1 px-5 py-4 hover:bg-muted focus-visible:-outline-offset-4"
          >
            <p className="break-words font-semibold">{exercise.name}</p>
            <p className="text-sm font-medium text-muted-foreground">
              {kindLabels[exercise.kind]}
              {exercise.unilateral ? ' · Each side' : ''} ·{' '}
              {exercise.metrics.map((key) => labelOf(key, exercise)).join(' · ')}
            </p>
            <p className="text-sm font-medium text-muted-foreground">
              {exercise.is_builtin ? 'Shared · Read-only' : 'Your exercise'}
            </p>
          </Link>
        )}
      </InfiniteList>
    </Page>
  );
}

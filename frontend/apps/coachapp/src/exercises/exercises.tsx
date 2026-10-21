import {metricLabel} from '@easy/workouts/metrics';
import {Link, NavLink, useLocation, useSearchParams} from 'react-router-dom';
import {useExercises} from '../api/exercises';
import {buttonVariants} from '../ui/button';
import {InfiniteList} from '../ui/infinite-list';
import {ListSearch} from '../ui/list-search';
import {Page, PageHeader, Surface} from '../ui/page';
import {goals, kindLabels, kinds, placeLabels, places} from './exercise';
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
    ...(params.get('archived') === 'true' ? {archived: true} : {}),
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
      <label className="flex min-h-11 items-center gap-3 font-medium">
        <input
          type="checkbox"
          checked={params.get('archived') === 'true'}
          onChange={(event) => filter('archived', event.target.checked ? 'true' : '')}
        />
        Show archived
      </label>
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
            <p className="flex flex-wrap items-center gap-2 break-words font-semibold">
              {exercise.name}
              {(exercise.is_builtin || exercise.archived_at) && (
                <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {exercise.is_builtin ? 'Shared · read-only' : 'Archived'}
                </span>
              )}
            </p>
            <p className="text-sm font-medium text-muted-foreground">
              {kindLabels[exercise.kind]}
              {exercise.metrics.length > 0 ? ' · ' : ''}
              {exercise.metrics.map((metric) => metricLabel(metric.key, metric)).join(' · ')}
            </p>
          </Link>
        )}
      </InfiniteList>
    </Page>
  );
}

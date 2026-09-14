import {generatePath, Link, useLocation, useSearchParams} from 'react-router-dom';
import {useExercises} from '../api/exercises';
import {routes} from '../routes';
import {buttonVariants} from '../ui/button';
import {InfiniteList} from '../ui/infinite-list';
import {ListSearch} from '../ui/list-search';
import {Page, PageHeader, Surface} from '../ui/page';
export function Exercises() {
  const [params] = useSearchParams();
  const {search} = useLocation();
  const state: unknown = useLocation().state;
  const deleted =
    state && typeof state === 'object' && 'deleted' in state && typeof state.deleted === 'string'
      ? state.deleted
      : null;
  const query = useExercises(params.get('search')?.trim() ?? '');
  return (
    <Page>
      <PageHeader
        title="Exercise library"
        description="Movements and coaching instructions for your training plans."
        back={{to: routes.trainingPlans, label: 'Back to training plans'}}
        actions={
          <Link
            to={routes.createExercise}
            state={{listSearch: search}}
            className={buttonVariants()}
          >
            Create exercise
          </Link>
        }
      />
      <ListSearch label="Search exercises" />
      {deleted && (
        <p
          role="status"
          className="break-words text-sm"
        >
          {deleted} deleted.
        </p>
      )}
      <InfiniteList
        query={query}
        label="exercises"
        singular="exercise"
        empty={
          <Surface>
            <h2 className="section-title">
              {params.get('search') ? 'No matching exercises' : 'Create your first exercise'}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {params.get('search')
                ? 'Try another name, or create the exercise you need.'
                : 'Add an exercise and its instructions, then select it when building a workout.'}
            </p>
          </Surface>
        }
      >
        {(exercise) => (
          <Link
            to={generatePath(routes.exercise, {id: exercise.id})}
            state={{listSearch: search}}
            className="block space-y-1 px-5 py-4 hover:bg-muted/50 focus-visible:-outline-offset-4"
          >
            <p className="break-words font-semibold">{exercise.name}</p>
            {exercise.equipment.length > 0 && (
              <p className="text-sm text-muted-foreground">{exercise.equipment.map((item) => item.name).join(' · ')}</p>
            )}
            {exercise.description && (
              <p className="line-clamp-2 text-sm text-muted-foreground">{exercise.description}</p>
            )}
            {exercise.source === 'system' && <p className="text-xs text-muted-foreground">Shared exercise</p>}
          </Link>
        )}
      </InfiniteList>
    </Page>
  );
}

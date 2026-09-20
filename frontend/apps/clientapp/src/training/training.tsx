import {useState} from 'react';
import {generatePath, Link, useNavigate, useParams, useSearchParams} from 'react-router-dom';
import {errorMessage} from '../api/client';
import {
  type SessionFilters,
  useActiveTraining,
  useStartTraining,
  useTrainingHistory,
  useTrainingPlan,
  useTrainingPlans,
} from '../api/training';
import {routes} from '../routes';
import {Button, buttonVariants} from '../ui/button';
import {CachedRead} from '../ui/cached-read';
import {useOnline} from '../ui/connection-status';
import {FormError} from '../ui/form-error';
import {InfiniteList} from '../ui/infinite-list';
import {Page} from '../ui/page';
import {ReadState} from '../ui/read-state';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';
import {dayLabel, sessionName, targetText} from './recording';

export function Training() {
  const [params, setParams] = useSearchParams();
  const history = params.get('view') === 'history';
  const search = params.get('search') ?? '';
  const state = params.get('state');
  const filters: SessionFilters = {
    search,
    ...(state === 'completed' || state === 'discarded' || state === 'active' ? {state} : {}),
    ...(params.get('from') ? {from: params.get('from') ?? ''} : {}),
    ...(params.get('to') ? {to: params.get('to') ?? ''} : {}),
  };
  return (
    <Page
      title="Training"
      description="Your plans and the work you've saved."
      back={routes.home}
    >
      <ActiveWorkout />
      <nav
        aria-label="Training views"
        className="my-6 flex gap-6"
      >
        <Link
          to={routes.training}
          aria-current={!history ? 'page' : undefined}
          className="text-link"
        >
          Your plans
        </Link>
        <Link
          to={`${routes.training}?view=history`}
          aria-current={history ? 'page' : undefined}
          className="text-link"
        >
          Workout history
        </Link>
      </nav>
      <form
        className="mb-6 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          const fields = new FormData(event.currentTarget);
          const next = new URLSearchParams(history ? {view: 'history'} : {});
          for (const name of ['search', 'from', 'to', 'state']) {
            const value = fields.get(name);
            if (typeof value === 'string' && value.trim()) {
              next.set(name, value.trim());
            }
          }
          setParams(next);
        }}
      >
        <label className="grid gap-2 font-medium">
          Search {history ? 'workouts' : 'plans'}
          <input
            className="h-12 w-full rounded-xl border border-border bg-surface px-3 text-base"
            key={search}
            name="search"
            type="search"
            defaultValue={search}
          />
        </label>
        {history && (
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-2 text-sm">
              From
              <input
                className="min-w-0 h-12 rounded-xl border border-border px-2 text-base"
                key={filters.from ?? ''}
                name="from"
                type="date"
                defaultValue={filters.from}
              />
            </label>
            <label className="grid gap-2 text-sm">
              To
              <input
                className="min-w-0 h-12 rounded-xl border border-border px-2 text-base"
                key={filters.to ?? ''}
                name="to"
                type="date"
                defaultValue={filters.to}
              />
            </label>
          </div>
        )}
        {history && (
          <SelectField
            aria-label="Workout status"
            name="state"
            key={filters.state ?? ''}
            defaultValue={filters.state ?? ''}
          >
            <SelectItem id="">All workouts</SelectItem>
            <SelectItem id="completed">Completed</SelectItem>
            <SelectItem id="discarded">Discarded</SelectItem>
            <SelectItem id="active">In progress</SelectItem>
          </SelectField>
        )}
        <Button
          type="submit"
          variant="outline"
        >
          Apply filters
        </Button>
      </form>
      {history ? <History filters={filters} /> : <Plans search={search} />}
      {!history && (
        <div className="mt-8 border-t border-border pt-6 space-y-3">
          <h2 className="text-xl font-semibold">Doing your own workout?</h2>
          <p className="text-muted-foreground">Record exercises without a plan.</p>
          <StartWorkout workoutId={null} />
        </div>
      )}
    </Page>
  );
}

export function ActiveWorkout() {
  const query = useActiveTraining();
  if (!query.data) {
    return (
      <ReadState
        label="your active workout"
        failed={query.isError}
        retry={() => {
          query.refetch();
        }}
      />
    );
  }
  const session = query.data.data;
  return (
    <>
      <CachedRead
        updatedAt={query.dataUpdatedAt}
        failed={query.isError}
        refreshing={query.isFetching}
        refresh={() => query.refetch()}
      />
      {session && (
        <section className="active-workout space-y-3 mb-5">
          <p className="text-sm text-muted-foreground">Workout in progress · {dayLabel(session.date)}</p>
          <h2 className="text-xl font-semibold">{sessionName(session)}</h2>
          <Link
            className={buttonVariants()}
            to={generatePath(routes.trainingSession, {id: session.id})}
          >
            Resume workout
          </Link>
        </section>
      )}
    </>
  );
}

function Plans({search}: {search: string}) {
  const query = useTrainingPlans(search);
  return (
    <>
      {query.data && (
        <CachedRead
          updatedAt={query.dataUpdatedAt}
          failed={query.isError}
          refreshing={query.isFetching}
          refresh={() => query.refetch()}
        />
      )}
      <InfiniteList
        query={query}
        label="plans"
        singular="plan"
        empty={
          <p className="py-5 text-muted-foreground">
            {search ? 'No plans match this search.' : 'Your coach has not shared a training plan yet.'}
          </p>
        }
      >
        {(plan) => (
          <Link
            className="block py-5 space-y-1"
            to={generatePath(routes.trainingPlan, {id: plan.id})}
          >
            <span className="block text-lg font-semibold">{plan.name}</span>
            <span className="block text-sm text-muted-foreground">
              {plan.lifecycle === 'current'
                ? 'Current plan'
                : plan.lifecycle === 'upcoming'
                  ? 'Starts soon'
                  : plan.lifecycle === 'ended'
                    ? 'Past plan'
                    : 'Dates not set'}{' '}
              · {plan.workout_count} workouts
            </span>
            {plan.start_date && (
              <span className="block text-sm">
                {dayLabel(plan.start_date)}
                {plan.end_date ? ` – ${dayLabel(plan.end_date)}` : ' onwards'}
              </span>
            )}
          </Link>
        )}
      </InfiniteList>
    </>
  );
}

function History({filters}: {filters: SessionFilters}) {
  const query = useTrainingHistory(filters);
  return (
    <>
      {query.data && (
        <CachedRead
          updatedAt={query.dataUpdatedAt}
          failed={query.isError}
          refreshing={query.isFetching}
          refresh={() => query.refetch()}
        />
      )}
      <InfiniteList
        query={query}
        label="workouts"
        singular="workout"
        empty={
          <p className="py-5 text-muted-foreground">
            No workouts match these dates and search. Your saved workouts will appear here.
          </p>
        }
      >
        {(session) => (
          <Link
            className="block py-5 space-y-1"
            to={generatePath(routes.trainingSession, {id: session.id})}
          >
            <span className="block text-lg font-semibold">{sessionName(session)}</span>
            <span className="block text-sm text-muted-foreground">
              {dayLabel(session.date)} ·{' '}
              {session.state === 'completed'
                ? 'Completed'
                : session.state === 'discarded'
                  ? 'Discarded'
                  : 'In progress'}
            </span>
          </Link>
        )}
      </InfiniteList>
    </>
  );
}

export function TrainingPlan() {
  const {id = '', workoutId} = useParams();
  const query = useTrainingPlan(id);
  const plan = query.data?.data;
  const workout = plan?.workouts.find((item) => item.id === workoutId);
  return (
    <Page
      title={workout?.name ?? plan?.name ?? 'Training plan'}
      description={workout ? plan?.name : (plan?.description ?? undefined)}
      back={workoutId ? generatePath(routes.trainingPlan, {id}) : routes.training}
    >
      {!plan ? (
        <ReadState
          label="your plan"
          failed={query.isError}
          retry={() => {
            query.refetch();
          }}
        />
      ) : (
        <>
          <CachedRead
            updatedAt={query.dataUpdatedAt}
            failed={query.isError}
            refreshing={query.isFetching}
            refresh={() => query.refetch()}
          />
          {workoutId ? (
            workout ? (
              <>
                <ol className="divide-y divide-border mb-8">
                  {workout.workout_elements.map((item) => (
                    <li
                      className="py-5 space-y-2"
                      key={item.id}
                    >
                      <h2 className="text-xl font-semibold">{item.exercise.name}</h2>
                      {item.planned_sets.length === 0 ? (
                        <p className="text-muted-foreground">No set targets prescribed.</p>
                      ) : (
                        <ol className="space-y-2">
                          {item.planned_sets.map((set, index) => (
                            <li
                              key={index}
                              className="text-muted-foreground"
                            >
                              <span className="font-medium">Set {index + 1}</span> · {targetText(set)}
                              {set.notes && <p className="text-sm mt-1">{set.notes}</p>}
                            </li>
                          ))}
                        </ol>
                      )}
                    </li>
                  ))}
                </ol>
                {plan.lifecycle === 'current' ? (
                  <StartWorkout workoutId={workout.id} />
                ) : (
                  <p className="text-muted-foreground">
                    This plan is not current. You can review its targets or return to your current training.
                  </p>
                )}
              </>
            ) : (
              <p role="alert">This workout is no longer in the plan. Go back to choose an available workout.</p>
            )
          ) : (
            <>
              <p className="mb-5 text-muted-foreground">
                {plan.start_date
                  ? `From ${dayLabel(plan.start_date)}${plan.end_date ? ` to ${dayLabel(plan.end_date)}` : ''}`
                  : 'Your coach has not set dates yet.'}
              </p>
              {plan.workouts.length === 0 && <p>No workouts have been added to this plan yet.</p>}
              <ul className="divide-y divide-border">
                {plan.workouts.map((item) => (
                  <li key={item.id}>
                    <Link
                      className="block py-5 space-y-1"
                      to={generatePath(routes.workout, {id, workoutId: item.id})}
                    >
                      <span className="block text-xl font-semibold">{item.name}</span>
                      <span className="block capitalize text-muted-foreground">
                        {item.weekdays.join(', ') || 'Choose any day'}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </Page>
  );
}

function StartWorkout({workoutId}: {workoutId: string | null}) {
  const mutation = useStartTraining();
  const navigate = useNavigate();
  const online = useOnline();
  const [error, setError] = useState('');
  return (
    <div className="space-y-3">
      {!online && (
        <p
          role="status"
          className="text-sm text-muted-foreground"
        >
          Reconnect to start. You can still read saved targets.
        </p>
      )}
      <FormError message={error} />
      <Button
        className="w-full"
        isDisabled={!online}
        isPending={mutation.isPending}
        onPress={async () => {
          setError('');
          try {
            const result = await mutation.mutateAsync(workoutId);
            if (result.data) {
              await navigate(generatePath(routes.trainingSession, {id: result.data.id}));
            }
          } catch (error) {
            setError(
              errorMessage(
                error,
                'Your workout could not be started. Try again to safely check for an active workout.',
              ),
            );
          }
        }}
      >
        {workoutId ? 'Start workout' : 'Start freestyle workout'}
      </Button>
    </div>
  );
}

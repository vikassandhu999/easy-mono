import {Check, ChevronRight, Dumbbell, History as HistoryIcon, Play, SlidersHorizontal} from 'lucide-react';
import {useState} from 'react';
import {generatePath, Link, useNavigate, useParams, useSearchParams} from 'react-router-dom';
import {useProfile} from '../api/auth';
import {errorMessage} from '../api/client';
import {
  type SessionFilters,
  type StartTraining,
  type TrainingPlan as TrainingPlanValue,
  useActiveTraining,
  useStartTraining,
  useTrainingCoverage,
  useTrainingHistory,
  useTrainingOccurrences,
  useTrainingPlan,
} from '../api/training';
import {routes} from '../routes';
import {BottomSheet} from '../ui/bottom-sheet';
import {Button, buttonVariants} from '../ui/button';
import {CachedRead} from '../ui/cached-read';
import {useCoaching} from '../ui/coaching';
import {useOnline} from '../ui/connection-status';
import {FormError} from '../ui/form-error';
import {InfiniteList} from '../ui/infinite-list';
import {Page} from '../ui/page';
import {ReadState} from '../ui/read-state';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';
import {dayLabel, sessionName, targetText} from './recording';

export function Training() {
  const {canWrite} = useCoaching();
  const [params, setParams] = useSearchParams();
  const history = !canWrite || params.get('view') === 'history';
  const [filtersOpen, setFiltersOpen] = useState(false);
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
      description={canWrite ? 'Your workout, ready when you are.' : 'The work you’ve put in.'}
      compact
    >
      <ActiveWorkout />
      {canWrite && (
        <nav
          aria-label="Training views"
          className="training-segments my-5"
        >
          <Link
            to={routes.training}
            aria-current={!history ? 'page' : undefined}
            className="min-h-12 flex items-center justify-center gap-2"
          >
            <Dumbbell
              className="size-4"
              aria-hidden="true"
            />
            Your plan
          </Link>
          <Link
            to={`${routes.training}?view=history`}
            aria-current={history ? 'page' : undefined}
            className="min-h-12 flex items-center justify-center gap-2"
          >
            <HistoryIcon
              className="size-4"
              aria-hidden="true"
            />
            Workout history
          </Link>
        </nav>
      )}
      {history && (
        <div className="flex items-center justify-between gap-3 mb-3">
          <p className="text-sm text-muted-foreground">The work you’ve put in.</p>
          <Button
            variant="outline"
            onPress={() => setFiltersOpen(true)}
            className="gap-2 shrink-0"
          >
            <SlidersHorizontal
              className="size-4"
              aria-hidden="true"
            />
            Filter workouts
          </Button>
        </div>
      )}
      {history && filtersOpen && (
        <BottomSheet
          title="Find a workout"
          onClose={() => setFiltersOpen(false)}
        >
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              const fields = new FormData(event.currentTarget);
              const next = new URLSearchParams({view: 'history'});
              for (const name of ['search', 'from', 'to', 'state']) {
                const value = fields.get(name);
                if (typeof value === 'string' && value.trim()) {
                  next.set(name, value.trim());
                }
              }
              setParams(next);
              setFiltersOpen(false);
            }}
          >
            <label className="grid gap-2 font-medium">
              Search workouts
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
              className="w-full"
            >
              Apply filters
            </Button>
          </form>
        </BottomSheet>
      )}
      {history ? (
        <History
          filters={filters}
          returnTo={`${routes.training}?${params}`}
        />
      ) : (
        <CurrentPlan />
      )}
      {canWrite && !history && (
        <div className="mt-6 space-y-3">
          <p className="text-sm text-muted-foreground">Training outside your plan?</p>
          <StartWorkout input={{}} />
        </div>
      )}
    </Page>
  );
}

export function ActiveWorkout() {
  const query = useActiveTraining();
  const {canWrite} = useCoaching();
  if (!canWrite) {
    return null;
  }
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
          <p className="text-sm text-muted-foreground">Workout in progress · {dayLabel(session.local_date)}</p>
          <h2 className="text-xl font-semibold">{sessionName(session)}</h2>
          <Link
            className={buttonVariants()}
            to={generatePath(routes.trainingSession, {id: session.id})}
          >
            <Play
              className="size-4 mr-2"
              aria-hidden="true"
            />
            Resume workout
          </Link>
        </section>
      )}
    </>
  );
}

function CurrentPlan() {
  const query = useTrainingCoverage();
  const profile = useProfile();
  const [params, setParams] = useSearchParams();
  const today = profile.data?.data.local_date ?? '';
  const date = params.get('date') ?? today;
  const occurrences = useTrainingOccurrences(date, date);
  const plan = query.data?.data?.plan;
  return (
    <div className="space-y-5">
      <label className="grid gap-2 font-medium">
        Scheduled date
        <input
          type="date"
          className="min-w-0 h-12 rounded-xl border border-border bg-surface px-3"
          value={date}
          max={today}
          onChange={(event) => {
            const next = new URLSearchParams(params);
            next.set('date', event.target.value);
            setParams(next);
          }}
        />
      </label>
      <p className="text-sm text-muted-foreground">
        Choose an earlier date to record a workout scheduled for that day.
      </p>
      {!occurrences.data ? (
        <ReadState
          label="scheduled workouts"
          failed={occurrences.isError}
          retry={() => occurrences.refetch()}
        />
      ) : (
        <>
          <CachedRead
            updatedAt={occurrences.dataUpdatedAt}
            failed={occurrences.isError}
            refreshing={occurrences.isFetching}
            refresh={() => occurrences.refetch()}
          />
          {occurrences.data.data.length === 0 && <p>No workouts scheduled for this date.</p>}
          {occurrences.data.data.map((occurrence) => (
            <section
              key={`${occurrence.plan_id}:${occurrence.schedule_entry_id}:${occurrence.occurrence_date}`}
              className="rounded-3xl bg-[var(--training)] p-5 space-y-3"
            >
              <h2 className="text-xl font-bold">{occurrence.workout_name}</h2>
              <p>
                {dayLabel(occurrence.occurrence_date)} · {occurrence.session_id ? 'Done' : 'Not recorded'}
              </p>
              {occurrence.session_id ? (
                <Link
                  className={buttonVariants({variant: 'outline'})}
                  to={generatePath(routes.trainingSession, {id: occurrence.session_id})}
                >
                  View saved workout
                </Link>
              ) : (
                <StartWorkout
                  input={{
                    plan_revision_id: occurrence.plan_revision_id,
                    workout_id: occurrence.workout_id,
                    schedule_entry_id: occurrence.schedule_entry_id,
                    occurrence_date: occurrence.occurrence_date,
                  }}
                />
              )}
            </section>
          ))}
        </>
      )}
      {!query.data ? (
        <ReadState
          label="your plan"
          failed={query.isError}
          retry={() => query.refetch()}
        />
      ) : plan ? (
        <section className="space-y-3">
          <h2 className="text-2xl font-bold">{plan.name}</h2>
          {plan.description && <p>{plan.description}</p>}
          <p className="text-sm text-muted-foreground">
            Other workouts from your current plan. Starting here records extra work.
          </p>
          <PlanWorkouts plan={plan} />
        </section>
      ) : (
        <p>Your coach has not scheduled a plan for today.</p>
      )}
    </div>
  );
}

function PlanWorkouts({plan}: {plan: TrainingPlanValue}) {
  return plan.content.workouts.length === 0 ? (
    <p>No workouts have been added yet.</p>
  ) : (
    <ul className="divide-y divide-border">
      {plan.content.workouts.map((workout) => (
        <li key={workout.id}>
          <Link
            className="training-list-row"
            to={generatePath(routes.workout, {id: plan.id, workoutId: workout.id})}
          >
            <span
              className="training-row-icon"
              aria-hidden="true"
            >
              <Dumbbell />
            </span>
            <span className="min-w-0 flex-1 text-xl font-bold">{workout.name}</span>
            <ChevronRight
              className="size-4 shrink-0"
              aria-hidden="true"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function History({filters, returnTo}: {filters: SessionFilters; returnTo: string}) {
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
            className="training-list-row"
            to={`${generatePath(routes.trainingSession, {id: session.id})}?${new URLSearchParams({returnTo})}`}
          >
            <span
              className="training-row-icon"
              aria-hidden="true"
            >
              {session.state === 'completed' ? <Check /> : <HistoryIcon />}
            </span>
            <span className="min-w-0 flex-1 space-y-1">
              <span className="block text-lg font-bold">{sessionName(session)}</span>
              <span className="block text-sm text-muted-foreground">
                {dayLabel(session.local_date)} ·{' '}
                {session.state === 'completed'
                  ? 'Completed'
                  : session.state === 'discarded'
                    ? 'Discarded'
                    : 'In progress'}
              </span>
            </span>
            <ChevronRight
              className="size-4 shrink-0"
              aria-hidden="true"
            />
          </Link>
        )}
      </InfiniteList>
    </>
  );
}

export function TrainingPlan() {
  const {canWrite} = useCoaching();
  const {id = '', workoutId} = useParams();
  const query = useTrainingPlan(id);
  const plan = query.data?.data;
  const workout = plan?.content.workouts.find((item) => item.id === workoutId);
  return (
    <Page
      title={workout?.name ?? plan?.name ?? 'Training plan'}
      description={workout ? plan?.name : (plan?.description ?? undefined)}
      back={routes.training}
      compact
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
          {plan.stopped_on && (
            <p className="mb-4 text-muted-foreground">Stopped when coaching ended on {dayLabel(plan.stopped_on)}.</p>
          )}
          {workoutId ? (
            workout ? (
              <>
                <ol className="space-y-4 mb-8">
                  {workout.blocks.map((block) => (
                    <li
                      key={block.id}
                      className="rounded-3xl bg-surface p-5 space-y-3"
                    >
                      <h2 className="text-sm font-bold capitalize">
                        {block.format}
                        {block.rounds ? ` · ${block.rounds} rounds` : ''}
                      </h2>
                      {block.notes && <p>{block.notes}</p>}
                      {block.items.map((item) => (
                        <div
                          key={item.id}
                          className="space-y-2"
                        >
                          <h3 className="text-xl font-bold">{item.exercise_name}</h3>
                          <ol className="space-y-2">
                            {item.sets.map((set, index) => (
                              <li
                                key={set.id}
                                className="rounded-2xl bg-[var(--training)] p-3"
                              >
                                Set {index + 1} · {targetText(set)}
                                {set.notes && <p className="text-sm">{set.notes}</p>}
                              </li>
                            ))}
                          </ol>
                        </div>
                      ))}
                    </li>
                  ))}
                </ol>
                {canWrite && plan.current_revision !== null && !plan.archived_at && !plan.stopped_on ? (
                  <StartWorkout input={{plan_revision_id: plan.current_revision.id, workout_id: workout.id}} />
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
              <PlanWorkouts plan={plan} />
            </>
          )}
        </>
      )}
    </Page>
  );
}

function StartWorkout({input}: {input: StartTraining}) {
  const mutation = useStartTraining();
  const navigate = useNavigate();
  const online = useOnline();
  const [error, setError] = useState('');
  const {canWrite} = useCoaching();
  if (!canWrite) {
    return null;
  }
  return (
    <div className={'space-y-3'}>
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
        variant={input.workout_id ? 'default' : 'outline'}
        isDisabled={!online}
        isPending={mutation.isPending}
        onPress={async () => {
          setError('');
          try {
            const result = await mutation.mutateAsync(input);
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
        {input.workout_id ? 'Start workout' : 'Start freestyle workout'}
      </Button>
    </div>
  );
}

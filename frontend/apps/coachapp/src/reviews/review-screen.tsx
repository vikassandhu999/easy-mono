import {useEffect, useRef, useState} from 'react';
import {useForm} from 'react-hook-form';
import {generatePath, Link, useNavigate, useParams, useSearchParams} from 'react-router-dom';
import {ApiError, errorMessage} from '../api/client';
import {type ReviewWrite, type ReviewScreen as Screen, useReviewScreen, useSaveReview} from '../api/reviews';
import {routes} from '../routes';
import {Button, buttonVariants} from '../ui/button';
import {FormError} from '../ui/form-error';
import {FormField} from '../ui/form-field';
import {Page, PageHeader, Surface} from '../ui/page';
import {TrackerMetricsDisplay} from '../ui/tracker-metrics';
import {defaultTrackerUnit} from '../ui/tracker-values';
import {changedValues, groupAction} from './review';
import {ReviewActions} from './review-actions';
import {ReviewForm} from './review-form';

export function ReviewScreen() {
  const {clientId = ''} = useParams();
  return (
    <ReviewWorkspace
      key={clientId}
      clientId={clientId}
    />
  );
}

function ReviewWorkspace({clientId}: {clientId: string}) {
  const [params] = useSearchParams();
  const from = params.get('from');
  const to = params.get('to');
  const range = {...(from ? {from} : {}), ...(to ? {to} : {})};
  const rangeKey = JSON.stringify(range);
  const query = useReviewScreen(clientId, range);
  const [snapshot, setSnapshot] = useState<{rangeKey: string; screen: Screen} | null>(null);
  useEffect(() => {
    // Only an explicit range change replaces the displayed read. Focus and request
    // invalidations must not advance the sequence that this Review acknowledges.
    if (
      query.data &&
      query.isFetchedAfterMount &&
      !query.isFetching &&
      !query.isError &&
      (!snapshot || snapshot.rangeKey !== rangeKey)
    ) {
      setSnapshot({rangeKey, screen: query.data.data});
    }
  }, [query.data, query.isFetchedAfterMount, query.isFetching, query.isError, rangeKey, snapshot]);
  if (snapshot) {
    return (
      <LoadedScreen
        screen={snapshot.screen}
        rangePending={snapshot.rangeKey !== rangeKey && !query.isError}
        rangeError={
          snapshot.rangeKey !== rangeKey && query.isError
            ? errorMessage(
                query.error,
                'Could not load this range. The previous summary and your draft are still here.',
              )
            : ''
        }
        retryRange={() => {
          query.refetch();
        }}
      />
    );
  }
  return (
    <Page className="client-page">
      <PageHeader
        title="Review client"
        back={{to: generatePath(routes.client, {id: clientId}), label: 'Back to client'}}
      />
      {query.isPending || query.isFetching || (query.data && query.isFetchedAfterMount && !query.isError) ? (
        <p role="status">Loading Review…</p>
      ) : (
        <>
          <FormError message={errorMessage(query.error, 'Could not load the Review. Try again.')} />
          <Button
            onPress={() => {
              query.refetch();
            }}
          >
            Retry Review
          </Button>
        </>
      )}
    </Page>
  );
}

function LoadedScreen({
  screen,
  rangePending,
  rangeError,
  retryRange,
}: {
  screen: Screen;
  rangePending: boolean;
  rangeError: string;
  retryRange: () => void;
}) {
  const attemptedSave = useRef<ReviewWrite | null>(null);
  const [saving, setSaving] = useState(false);
  const clientId = screen.client.id;
  const save = useSaveReview(clientId);
  const navigate = useNavigate();
  return (
    <Page className="client-page">
      <PageHeader
        title={`Review ${screen.client.preferred_name || screen.client.full_name}`}
        description={`Record seen ${new Date(screen.seen_at).toLocaleString()}`}
        back={{to: generatePath(routes.client, {id: clientId}), label: 'Back to client'}}
        actions={
          <Link
            className={buttonVariants({variant: 'outline'})}
            to={generatePath(routes.reviews, {clientId})}
          >
            Review history
          </Link>
        }
      />
      {screen.last_review && (
        <aside className="rounded-xl border border-border bg-muted p-5">
          <h2 className="section-title">Last Review's private note</h2>
          <p className="mt-3 whitespace-pre-wrap">{screen.last_review.private_note || 'No private note.'}</p>
          <p className="mt-3 text-sm text-muted-foreground">
            {screen.last_review.coach_name} · {new Date(screen.last_review.reviewed_at).toLocaleDateString()}
          </p>
        </aside>
      )}
      <section
        className="space-y-4"
        aria-label="New since last review"
      >
        <h2 className="section-title">New since last review</h2>
        {screen.changes.length === 0 ? (
          <Surface>No new records or corrections.</Surface>
        ) : (
          screen.changes.map((group) => (
            <ChangeGroup
              key={`${group.record_type}:${group.record_id}`}
              clientId={clientId}
              group={group}
            />
          ))
        )}
      </section>
      <section className="space-y-4">
        <h2 className="section-title">Summary</h2>
        <RangeForm
          screen={screen}
          isDisabled={saving || rangePending}
        />
        {rangePending && <p role="status">Loading summary range… Your Review draft is still here.</p>}
        {rangeError && (
          <>
            <FormError message={rangeError} />
            <Button
              variant="outline"
              onPress={retryRange}
            >
              Retry summary range
            </Button>
          </>
        )}
        <p className="text-sm text-muted-foreground">
          Showing {screen.from} to {screen.to}
        </p>
        <Summary screen={screen} />
      </section>
      <Surface className="space-y-4">
        <h2 className="section-title">Plans</h2>
        <div className="flex flex-wrap gap-4">
          <Link
            className="text-link"
            to={generatePath(routes.clientTrainingPlans, {clientId})}
          >
            Training plans
          </Link>
          {screen.plans.map((plan) => (
            <Link
              key={plan.id}
              className="text-link"
              to={generatePath(routes.editClientTrainingPlan, {clientId, id: plan.id})}
            >
              {plan.name}
            </Link>
          ))}
        </div>
      </Surface>
      <ReviewActions person={screen.client} />
      <Surface className="space-y-5">
        <h2 className="section-title">Save a Review</h2>
        {screen.client.current_term ? (
          <ReviewForm
            isDisabled={rangePending}
            initial={screen.last_review ? {...screen.last_review, private_note: null, reply: null} : null}
            save={async (values) => {
              const body = attemptedSave.current ?? {...values, snapshot_token: screen.snapshot_token};
              attemptedSave.current = body;
              setSaving(true);
              try {
                await save.mutateAsync(body);
                attemptedSave.current = null;
                navigate(generatePath(routes.reviews, {clientId}));
              } catch (cause) {
                if (cause instanceof ApiError && cause.status < 500) {
                  attemptedSave.current = null;
                  setSaving(false);
                }
                throw cause;
              }
            }}
          />
        ) : (
          <p>A current coaching term is required to save a Review. History stays available.</p>
        )}
      </Surface>
    </Page>
  );
}
function RangeForm({screen, isDisabled}: {screen: Screen; isDisabled: boolean}) {
  const [params, setParams] = useSearchParams();
  const form = useForm({defaultValues: {from: screen.from, to: screen.to}});
  return (
    <form
      className="grid items-end gap-4 sm:grid-cols-3"
      onSubmit={form.handleSubmit((values) => {
        const next = new URLSearchParams(params);
        next.set('from', values.from);
        next.set('to', values.to);
        setParams(next);
      })}
    >
      <FormField
        control={form.control}
        name="from"
        label="Summary from"
        isDisabled={isDisabled}
        type="date"
        isRequired
      />
      <FormField
        control={form.control}
        name="to"
        label="Summary to"
        isDisabled={isDisabled}
        type="date"
        isRequired
      />
      <Button
        type="submit"
        variant="outline"
        isDisabled={isDisabled}
      >
        Update summary range
      </Button>
    </form>
  );
}
function ChangeGroup({group, clientId}: {group: Screen['changes'][number]; clientId: string}) {
  const action = groupAction(group);
  const date = group.local_date ?? '';
  const trackerId = group.tracker_id ?? '';
  const href =
    group.record_type === 'workout'
      ? generatePath(routes.trainingSession, {clientId, id: group.record_id})
      : `${generatePath(routes.trackerHistory, {clientId})}?${new URLSearchParams({...(trackerId ? {tracker_id: trackerId} : {}), ...(date ? {from: date, to: date} : {})})}`;
  return (
    <Surface className="space-y-4">
      <h3 className="editor-item-title">
        {group.title} · {action}
      </h3>
      {group.changes.map((change) => (
        <div
          key={`${change.seq}:${change.row_type}:${change.row_id}`}
          className="space-y-2"
        >
          <p className="text-sm text-muted-foreground">
            {change.action} · {new Date(change.changed_at).toLocaleString()}
          </p>
          <dl className="space-y-2">
            {changedValues(change.old_value, change.new_value).map((value) => (
              <div
                key={value.field}
                className="grid gap-1 text-sm sm:grid-cols-[12rem_1fr]"
              >
                <dt className="text-muted-foreground capitalize">{value.field}</dt>
                <dd className="whitespace-pre-wrap break-words">
                  {value.before} → {value.after}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
      {action === 'removed' && (
        <p className="text-sm">This record was removed. The values above are its saved history.</p>
      )}
      <Link
        className="text-link"
        to={href}
      >
        {action === 'removed' ? 'Open record history' : 'Open record'}
      </Link>
    </Surface>
  );
}
function Summary({screen}: {screen: Screen}) {
  const clientId = screen.client.id;
  const range = new URLSearchParams({from: screen.from, to: screen.to});
  const training = `${generatePath(routes.trainingSessions, {clientId})}?${range}`;
  return (
    <div className="space-y-5">
      <Surface className="space-y-4">
        <h3 className="editor-item-title">Training</h3>
        <Link
          className="text-link"
          to={training}
        >
          {screen.training_counts.completed} completed of {screen.training_counts.expected} expected ·{' '}
          {screen.training_counts.extra} extra sessions
        </Link>
        <ul className="space-y-2">
          {screen.training.data.map((item) => (
            <li key={`${item.plan_id}:${item.schedule_entry_id}:${item.occurrence_date}`}>
              <Link
                className="text-link"
                to={
                  item.session_id
                    ? generatePath(routes.trainingSession, {clientId, id: item.session_id})
                    : generatePath(routes.manageClientTrainingPlan, {clientId, id: item.plan_id})
                }
              >
                {item.occurrence_date} · {item.workout_name} · {item.session_id ? 'Done' : 'Not recorded'}
              </Link>
            </li>
          ))}
          {screen.training.extra_sessions.map((item) => (
            <li key={item.id}>
              <Link
                className="text-link"
                to={generatePath(routes.trainingSession, {clientId, id: item.id})}
              >
                {item.local_date} · Extra session
              </Link>
            </li>
          ))}
        </ul>
      </Surface>
      <section className="space-y-4">
        <h3 className="editor-item-title">Trackers</h3>
        {screen.trackers.length === 0 && <p>No Tracker entries in this range.</p>}
        {screen.trackers.map((value) => (
          <div
            key={value.tracker.id}
            className="space-y-2"
          >
            <TrackerMetricsDisplay
              value={value}
              unit={defaultTrackerUnit(value.tracker, screen.client.unit_system)}
            />
            <Link
              className="text-link"
              to={`${generatePath(routes.trackerHistory, {clientId})}?${range}&tracker_id=${value.tracker.id}`}
            >
              Open {value.tracker.name} records and coverage
            </Link>
          </div>
        ))}
      </section>
    </div>
  );
}

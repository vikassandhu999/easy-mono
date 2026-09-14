import {Check} from 'lucide-react';
import {generatePath, Link, useParams} from 'react-router-dom';
import {useCheckInResponse, useReviewCheckIn} from '../api/check-in-responses';
import {ApiError, errorMessage} from '../api/client';
import {routes} from '../routes';
import {Button, buttonVariants} from '../ui/button';
import {FormError} from '../ui/form-error';
import {useListLocation} from '../ui/list-location';
import {Page, PageHeader, StatusBadge, Surface} from '../ui/page';
import {SubmissionAnswers} from '../ui/submission-answers';

export function CheckInResponse() {
  const {id = '', clientId} = useParams();
  return (
    <Response
      key={id}
      id={id}
      {...(clientId ? {clientId} : {})}
    />
  );
}

function Response({id, clientId}: {id: string; clientId?: string}) {
  const query = useCheckInResponse(id);
  const review = useReviewCheckIn(id);
  const {to, state} = useListLocation(
    clientId ? generatePath(routes.clientCheckInResponses, {clientId}) : routes.checkInResponses,
  );
  const back = {to, state, label: 'Back to responses'};
  const submission = query.data?.data;
  const mismatch = submission && clientId && submission.client.id !== clientId;
  if (!submission || mismatch) {
    const missing = mismatch || (query.error instanceof ApiError && query.error.status === 404);
    return (
      <Page>
        <PageHeader
          title={missing ? 'Response not found' : 'Check-in response'}
          back={back}
        />
        <Surface>
          {query.isPending ? (
            <div
              role="status"
              className="space-y-6 animate-pulse"
            >
              <p>Loading response…</p>
              <div className="h-6 w-1/2 rounded bg-muted" />
              <div className="h-24 rounded bg-muted" />
            </div>
          ) : (
            <div className="space-y-4">
              <FormError
                message={
                  missing
                    ? 'This response is unavailable or you no longer have access to it.'
                    : errorMessage(query.error, 'Could not load this response.')
                }
              />
              {!missing && (
                <Button
                  onPress={() => {
                    query.refetch();
                  }}
                >
                  Try again
                </Button>
              )}
              <Link
                to={to}
                state={state}
                className="text-link"
              >
                Return to responses
              </Link>
            </div>
          )}
        </Surface>
      </Page>
    );
  }
  const person = submission.client;
  const name = `${person.first_name ?? ''} ${person.last_name ?? ''}`.trim() || person.email || 'Client';
  return (
    <Page>
      <PageHeader
        title={submission.form_assignment.form_template.name}
        back={back}
        description={
          <Link
            to={generatePath(routes.client, {id: person.id})}
            className="text-link"
          >
            {name}
          </Link>
        }
        actions={
          <Button
            variant="outline"
            isPending={query.isFetching}
            onPress={() => {
              query.refetch();
            }}
          >
            Refresh response
          </Button>
        }
      />
      <div className="space-y-3">
        <StatusBadge tone={submission.reviewed_at ? 'positive' : 'neutral'}>
          {submission.reviewed_at ? 'Reviewed' : 'Needs review'}
        </StatusBadge>
        <p className="text-sm text-muted-foreground">
          Submitted{' '}
          <time dateTime={submission.submitted_at}>
            {new Date(submission.submitted_at).toLocaleString(undefined, {dateStyle: 'medium', timeStyle: 'short'})}
          </time>
          {submission.submitted_by_type === 'coach'
            ? ' · By a coach'
            : submission.submitted_by_type === 'system'
              ? ' · Recorded automatically'
              : ' · By the client'}
        </p>
        {submission.form_assignment.due_date && (
          <p className="text-sm text-muted-foreground">
            Due <time dateTime={submission.form_assignment.due_date}>{submission.form_assignment.due_date}</time>
          </p>
        )}
        {query.isError && (
          <FormError message="Could not refresh this response. Showing the previously loaded answers." />
        )}
      </div>
      <Link
        to={`${generatePath(routes.clientConversation, {clientId: person.id})}?response=${encodeURIComponent(submission.id)}`}
        className={buttonVariants({variant: 'outline'})}
      >
        Discuss with client
      </Link>
      <SubmissionAnswers submission={submission} />
      <Surface className="space-y-4">
        {submission.reviewed_at ? (
          <div
            role="status"
            className="space-y-2"
          >
            <h2 className="flex items-center gap-2 font-semibold">
              <Check
                className="size-5"
                aria-hidden="true"
              />
              Review saved
            </h2>
            <p className="text-sm text-muted-foreground">
              Reviewed{' '}
              <time dateTime={submission.reviewed_at}>
                {new Date(submission.reviewed_at).toLocaleString(undefined, {dateStyle: 'medium', timeStyle: 'short'})}
              </time>
              . These answers stay available for reference.
            </p>
          </div>
        ) : (
          <>
            <h2 className="section-title">Finished reading?</h2>
            <p className="text-sm text-muted-foreground">Mark this check-in reviewed to clear it from Needs review.</p>
            {review.isError && (
              <FormError
                message={errorMessage(
                  review.error,
                  'The review could not be confirmed. Refresh the response or try again.',
                )}
              />
            )}
            <Button
              isPending={review.isPending}
              className="w-full sm:w-auto"
              onPress={async () => {
                try {
                  await review.mutateAsync();
                } catch {
                  /* Error stays beside the action. */
                }
              }}
            >
              Mark reviewed
            </Button>
          </>
        )}
        <Link
          to={to}
          state={state}
          className={buttonVariants({variant: 'outline'})}
        >
          Return to responses
        </Link>
      </Surface>
    </Page>
  );
}

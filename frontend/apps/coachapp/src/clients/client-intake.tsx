import {Check, ClipboardList} from 'lucide-react';
import {errorMessage} from '../api/client';
import type {Client} from '../api/clients';
import {type FormAssignment, type useFormSubmissions, useReviewIntake} from '../api/forms';
import {Button} from '../ui/button';
import {FormError} from '../ui/form-error';
import {StatusBadge, Surface} from '../ui/page';
import {IntakeAnswers} from './intake-answers';
import {IntakePreview} from './intake-preview';

type IntakeProps = {assignment: FormAssignment; person: Client; submissions: ReturnType<typeof useFormSubmissions>};

export function ClientIntake({assignment, person, submissions}: IntakeProps) {
  if (assignment.latest_submission || assignment.status === 'completed') {
    return (
      <SubmittedIntake
        assignment={assignment}
        person={person}
        submissions={submissions}
      />
    );
  }
  const dismissed = assignment.status === 'dismissed';
  const inactive = person.status === 'inactive';
  return (
    <>
      <Surface>
        <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-muted">
          <ClipboardList
            size={20}
            aria-hidden="true"
          />
        </div>
        <h2 className="section-title">
          {dismissed
            ? 'Intake dismissed'
            : inactive
              ? 'Intake paused'
              : person.joined_at
                ? 'Intake pending'
                : 'Intake form'}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {dismissed
            ? 'This intake was dismissed. No answers have been submitted.'
            : inactive
              ? 'This client is inactive. They can complete their intake once their coaching access is active again.'
              : person.joined_at
                ? 'Your client has joined. Their intake is ready in their app; their answers will appear here when submitted.'
                : 'Available after acceptance'}
        </p>
        {assignment.status === 'in_progress' && (
          <p className="mt-3 text-sm font-medium">Your client has started their intake.</p>
        )}
        {assignment.status === 'missed' && <p className="mt-3 text-sm font-medium">The intake due date has passed.</p>}
      </Surface>
      <IntakePreview template={assignment.form_template} />
    </>
  );
}

function SubmittedIntake({assignment, person, submissions}: IntakeProps) {
  const review = useReviewIntake(person.id, assignment.id);
  const submission = submissions.data?.data[0];
  if (submissions.isPending || submissions.isError || !submission) {
    return (
      <Surface className="space-y-4">
        <h2 className="section-title">Intake submitted</h2>
        {submissions.isPending ? (
          <p
            role="status"
            className="text-sm text-muted-foreground"
          >
            Loading answers…
          </p>
        ) : (
          <>
            <FormError
              message={
                submissions.isError
                  ? errorMessage(submissions.error, "We couldn't load the answers. Please try again.")
                  : 'The submission is unavailable. Refresh to try again.'
              }
            />
            <Button
              variant="outline"
              onPress={() => {
                submissions.refetch();
              }}
            >
              Retry answers
            </Button>
          </>
        )}
      </Surface>
    );
  }
  const markReviewed = async () => {
    try {
      await review.mutateAsync(submission.id);
    } catch {
      /* The mutation's error is shown beside the action. */
    }
  };
  return (
    <>
      <Surface className="space-y-4">
        <StatusBadge tone={submission.reviewed_at ? 'positive' : 'neutral'}>
          {submission.reviewed_at ? 'Reviewed' : 'Ready for review'}
        </StatusBadge>
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            {submission.reviewed_at ? 'Intake reviewed' : 'Intake submitted'}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {submission.reviewed_at
              ? 'Their answers are saved here for reference.'
              : 'Read through their goals, preferences, and limitations before preparing their plans.'}
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
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
        </div>
      </Surface>
      <IntakeAnswers submission={submission} />
      <Surface className="space-y-4">
        {submission.reviewed_at ? (
          <div role="status">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Check
                size={18}
                aria-hidden="true"
              />
              Review saved
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {person.status === 'inactive'
                ? 'Their answers remain available while their coaching access is inactive.'
                : person.stage === 'coaching'
                  ? 'Use these answers when preparing or updating their coaching plans.'
                  : 'Next: prepare their coaching plans using these goals and preferences.'}
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              Reviewed{' '}
              <time dateTime={submission.reviewed_at}>
                {new Date(submission.reviewed_at).toLocaleString(undefined, {dateStyle: 'medium', timeStyle: 'short'})}
              </time>
            </p>
          </div>
        ) : (
          <>
            <div>
              <h3 className="section-title">Finished reviewing?</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Save your review so you know this intake has been read.
              </p>
            </div>
            {review.isError && (
              <FormError message={errorMessage(review.error, "We couldn't save your review. Please try again.")} />
            )}
            <Button
              className="w-full sm:w-auto"
              isPending={review.isPending}
              onPress={markReviewed}
            >
              <Check aria-hidden="true" />
              Mark intake reviewed
            </Button>
          </>
        )}
      </Surface>
    </>
  );
}

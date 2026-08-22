import {Button, Chip, Typography} from '@heroui/react';
import {useListClientFormAssignmentsForCoachQuery, useReviewFormSubmissionMutation} from '@/api/checkins';
import {useListClientWeightEntriesQuery} from '@/api/clients';
import {submissionPhotoIds} from '@/checkins/form-answers';
import {formatDayMonth} from '@/clients/client-detail-data';
import {FormAnswer} from '@/clients/client-form-answer';
import {ROUTES} from '@/routes';
import {BackButton} from '@/ui/back-button';
import {ErrorState} from '@/ui/error-state';
import {toastMutationError} from '@/ui/mutation-toast';
import {Page} from '@/ui/page';
import {PageSkeleton} from '@/ui/page-skeleton';
import useAttachmentDownloadUrls from '@/ui/use-attachment-download-urls';
import {useGoBack} from '@/ui/use-go-back';
import {useRouteParam} from '@/ui/use-route-param';

/**
 * The design's footer bar: full width, hairline above, on the surface, and sticky
 * to the bottom of the scrolling pane at BOTH widths — unlike a form's actions,
 * which only stick on mobile.
 */
const FOOTER = 'sticky bottom-0 z-10 -mx-4 mt-auto flex items-center border-t border-border bg-surface px-4 py-4';

/** CD-CS — one submitted check-in, and the review action that clears it. */
export default function CheckinSubmission() {
  const assignmentId = useRouteParam('assignmentId');
  const id = useRouteParam('id');
  const goBack = useGoBack(`${ROUTES.CLIENT_DETAIL.replace(':id', id)}?tab=checkins`);
  const {data, isError, isLoading, refetch} = useListClientFormAssignmentsForCoachQuery(id);
  const reviewMutation = useReviewFormSubmissionMutation();
  // A weight ANSWER carries no unit, and the design shows `72.4 kg` — the client's
  // logging unit comes from their weight entries (RTK dedupes this with CD-OV).
  const weights = useListClientWeightEntriesQuery(id);
  const weightUnit = weights.data?.entries?.[0]?.unit ?? 'kg';

  const assignment = data?.data.find((a) => a.id === assignmentId);
  const submission = assignment?.latest_submission;
  const photoIds = submission ? submissionPhotoIds(submission) : [];
  const {urls} = useAttachmentDownloadUrls(photoIds);

  const header = (title: string) => (
    <Page.Header size="content">
      <Page.TitleGroup className="flex items-center">
        <BackButton onPress={goBack} />
        <Page.Title>{title}</Page.Title>
      </Page.TitleGroup>
    </Page.Header>
  );

  if (isLoading) {
    return (
      <Page>
        {header('Check-in')}
        <Page.Content bare>
          <Page.Frame
            className="pt-4 pb-6"
            size="content"
          >
            <PageSkeleton />
          </Page.Frame>
        </Page.Content>
      </Page>
    );
  }
  if (isError || !data || !assignment || !submission) {
    return (
      <Page>
        {header('Check-in')}
        <Page.Content bare>
          <Page.Frame
            className="pt-4 pb-6"
            size="content"
          >
            <ErrorState
              message="Couldn't load this check-in."
              onRetry={refetch}
            />
          </Page.Frame>
        </Page.Content>
      </Page>
    );
  }

  const isReviewed = Boolean(assignment.latest_submission_reviewed_at);

  const markReviewed = async () => {
    try {
      await reviewMutation.mutateAsync(submission.id);
    } catch (err) {
      toastMutationError(err, "The check-in wasn't marked reviewed. Try again.");
    }
  };

  return (
    <Page>
      <Page.Header size="content">
        <Page.TitleGroup className="flex items-center">
          <BackButton onPress={goBack} />
          <div className="min-w-0">
            <Page.Title>{assignment.form_template.name}</Page.Title>
            {submission.submitted_at && (
              <Page.Description>Submitted {formatSubmittedAt(submission.submitted_at)}</Page.Description>
            )}
          </div>
        </Page.TitleGroup>
        <Page.Actions>
          <Chip
            color={isReviewed ? 'default' : 'warning'}
            size="sm"
            variant="soft"
          >
            {isReviewed ? 'Reviewed' : 'Needs review'}
          </Chip>
        </Page.Actions>
      </Page.Header>
      <Page.Content bare>
        <Page.Frame
          className="flex min-h-full flex-col gap-6 pt-4 pb-6"
          size="content"
        >
          {/* The design reads the answers as a flat list on the page — a label and
              its value, six of them, nothing between. One card per form section put
              three nested boxes between the coach and the numbers. Section titles
              stay (a real form has them; the design's example form does not) but as
              an eyebrow above their group, not a card. */}
          {submission.question_snapshot.map((section, index) => (
            <div
              className="flex flex-col gap-6"
              key={section.title ?? index}
            >
              {section.title && <div className="eyebrow">{section.title}</div>}
              {(section.questions ?? []).map((question) => (
                <FormAnswer
                  key={question.id}
                  label={question.label}
                  photoUrls={question.type === 'photo' ? photoIds.map((photoId) => urls[photoId]) : undefined}
                  type={question.type}
                  value={submission.answers[question.id]}
                  weightUnit={weightUnit}
                />
              ))}
            </div>
          ))}

          {/* Mark reviewed is the design's full-width footer action, not a header
              button: it is the one thing this screen exists to do. */}
          <div className={FOOTER}>
            {isReviewed ? (
              <Typography
                className="w-full text-center"
                color="muted"
                type="body-xs"
                weight="medium"
              >
                Reviewed{' '}
                {assignment.latest_submission_reviewed_at
                  ? formatDayMonth(assignment.latest_submission_reviewed_at.slice(0, 10))
                  : ''}
              </Typography>
            ) : (
              <Button
                className="w-full bg-ink text-ink-foreground"
                isPending={reviewMutation.isPending}
                onPress={markReviewed}
              >
                Mark reviewed
              </Button>
            )}
          </div>
        </Page.Frame>
      </Page.Content>
    </Page>
  );
}

/** `Submitted 17 Jul, 6:42 pm` — the design shows the time, not just the day. */
function formatSubmittedAt(iso: string): string {
  const day = formatDayMonth(iso.slice(0, 10));
  const time = new Intl.DateTimeFormat('en-GB', {hour: 'numeric', hour12: true, minute: '2-digit'})
    .format(new Date(iso))
    .toLowerCase();
  return `${day}, ${time}`;
}

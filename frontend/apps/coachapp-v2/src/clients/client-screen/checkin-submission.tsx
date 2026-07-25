import {Button, Chip, Typography} from '@heroui/react';
import {useParams} from 'react-router-dom';

import {BackButton} from '@/@components/back-button';
import {ErrorState} from '@/@components/error-state';
import {toastMutationError} from '@/@components/mutation-toast';
import {Page} from '@/@components/page';
import {PageSkeleton} from '@/@components/page-skeleton';
import {ROUTES} from '@/@config/routes';
import useAttachmentDownloadUrls from '@/@hooks/use-attachment-download-urls';
import {useGoBack} from '@/@hooks/use-go-back';
import {useListClientFormAssignmentsForCoachQuery, useReviewFormSubmissionMutation} from '@/api/generated';
import {PhotoThumb} from '@/clients/components/photo-thumb';
import {SectionCard} from '@/clients/components/section-card';
import {formatDayMonth} from '@/clients/lib/client-detail-data';

/** CD-CS — one submitted check-in, and the review action that clears it. */
export default function CheckinSubmission() {
  const {assignmentId = '', id = ''} = useParams<{assignmentId: string; id: string}>();
  const goBack = useGoBack(`${ROUTES.CLIENT_DETAIL.replace(':id', id)}?tab=checkins`);
  const {data, isError, isLoading, refetch} = useListClientFormAssignmentsForCoachQuery({clientId: id});
  const [review, {isLoading: isReviewing}] = useReviewFormSubmissionMutation();

  const assignment = data?.data.find((a) => a.id === assignmentId);
  const submission = assignment?.latest_submission;
  const photos = (submission?.attachments ?? []).filter((a) => a.content_type.startsWith('image/'));
  const {urls} = useAttachmentDownloadUrls(photos.map((p) => p.id));

  const header = (title: string) => (
    <Page.Header size="content">
      <Page.TitleGroup className="flex items-center gap-1">
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
          <Page.Frame className="pt-4 pb-6">
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
          <Page.Frame className="pt-4 pb-6">
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
  const answers = (submission.answers ?? {}) as Record<string, unknown>;

  const markReviewed = async () => {
    try {
      await review({id: submission.id}).unwrap();
    } catch (err) {
      toastMutationError(err, "The check-in wasn't marked reviewed. Try again.");
    }
  };

  return (
    <Page>
      <Page.Header size="content">
        <Page.TitleGroup className="flex items-center gap-1">
          <BackButton onPress={goBack} />
          <div className="min-w-0">
            <Page.Title>{assignment.form_template.name}</Page.Title>
            {submission.submitted_at && (
              <Page.Description>Submitted {formatDayMonth(submission.submitted_at.slice(0, 10))}</Page.Description>
            )}
          </div>
        </Page.TitleGroup>
        <Page.Toolbar size="content">
          <Chip
            color={isReviewed ? 'success' : 'warning'}
            size="sm"
            variant="soft"
          >
            {isReviewed ? 'Reviewed' : 'Needs review'}
          </Chip>
          {!isReviewed && (
            <Button
              isPending={isReviewing}
              onPress={markReviewed}
              variant="primary"
            >
              Mark reviewed
            </Button>
          )}
        </Page.Toolbar>
      </Page.Header>
      <Page.Content bare>
        <Page.Frame className="flex flex-col gap-4 pt-4 pb-6">
          {submission.question_snapshot.map((section, index) => (
            <SectionCard
              divided
              key={section.title ?? index}
              title={section.title}
            >
              {(section.questions ?? []).map((question) => (
                <div
                  className="px-4 py-3"
                  key={question.id}
                >
                  <span className="eyebrow">{question.label}</span>
                  <Typography
                    className="mt-1"
                    type="body-sm"
                  >
                    {formatAnswer(answers[question.id])}
                  </Typography>
                </div>
              ))}
            </SectionCard>
          ))}

          {photos.length > 0 && (
            <SectionCard title="Progress photos">
              <div className="grid grid-cols-3 gap-3 px-4 pb-4 sm:grid-cols-4">
                {photos.map((photo) => (
                  <PhotoThumb
                    alt="Progress photo"
                    fill
                    key={photo.id}
                    src={urls[photo.id]}
                  />
                ))}
              </div>
            </SectionCard>
          )}

          {isReviewed && assignment.latest_submission_reviewed_at && (
            <Typography
              color="muted"
              type="body-xs"
            >
              Reviewed {formatDayMonth(assignment.latest_submission_reviewed_at.slice(0, 10))}
            </Typography>
          )}
        </Page.Frame>
      </Page.Content>
    </Page>
  );
}

/** Shared shape with CD-IR: arrays join, booleans read yes/no, blanks are em dashes. */
function formatAnswer(value: unknown): string {
  if (value == null || value === '') {
    return '—';
  }
  if (Array.isArray(value)) {
    return value.length ? value.map(String).join(' · ') : '—';
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  return String(value);
}

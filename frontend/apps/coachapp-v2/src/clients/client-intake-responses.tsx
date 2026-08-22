import {ClipboardList} from 'lucide-react';
import {useListClientFormAssignmentsForCoachQuery} from '@/api/checkins';
import {formatDayMonth} from '@/clients/client-detail-data';
import {FormAnswer} from '@/clients/client-form-answer';
import {SectionCard} from '@/clients/client-section-card';
import {submissionPhotoIds} from '@/library/checkins/form-answers';
import {ROUTES} from '@/routes';
import {BackButton} from '@/ui/back-button';
import {EmptyState} from '@/ui/empty-state';
import {ErrorState} from '@/ui/error-state';
import {Page} from '@/ui/page';
import {PageSkeleton} from '@/ui/page-skeleton';
import useAttachmentDownloadUrls from '@/ui/use-attachment-download-urls';
import {useGoBack} from '@/ui/use-go-back';
import {useRouteParam} from '@/ui/use-route-param';

/**
 * CD-IR — the intake answers, read-only.
 *
 * Questions come from `question_snapshot.questions` on the submission, not from
 * the live template: a template edited after submission must not relabel answers
 * that were given against the old wording. The snapshot exists for exactly this.
 */
export default function IntakeResponses() {
  const id = useRouteParam('id');
  const goBack = useGoBack(ROUTES.CLIENT_DETAIL.replace(':id', id));
  const {data, isError, isLoading, refetch} = useListClientFormAssignmentsForCoachQuery(id);

  const intake = data?.data.find((a) => a.purpose === 'intake');
  const submission = intake?.latest_submission;
  // Photo ids live in the ANSWERS, not `attachments` — see `submissionPhotoIds`.
  // Resolved here, above the early returns: `useAttachmentDownloadUrls` is a hook.
  const photoIds = submission ? submissionPhotoIds(submission) : [];
  const {urls} = useAttachmentDownloadUrls(photoIds);

  const header = (
    <Page.Header size="content">
      <Page.TitleGroup className="flex items-center">
        <BackButton onPress={goBack} />
        <Page.Title>Intake</Page.Title>
      </Page.TitleGroup>
    </Page.Header>
  );

  if (isLoading) {
    return (
      <Page>
        {header}
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
  if (isError || !data) {
    return (
      <Page>
        {header}
        <Page.Content bare>
          <Page.Frame
            className="pt-4 pb-6"
            size="content"
          >
            <ErrorState
              message="Couldn't load intake responses."
              onRetry={refetch}
            />
          </Page.Frame>
        </Page.Content>
      </Page>
    );
  }

  // `question_snapshot` is an ARRAY OF SECTIONS, each with its own `questions` and
  // an optional title — not a flat question list, and not a `{sections: […]}`
  // wrapper. Rendering the sections keeps the answers in the order and grouping the
  // client actually filled them in.
  const sections = submission?.question_snapshot ?? [];
  const questionCount = sections.reduce((n, section) => n + (section.questions?.length ?? 0), 0);

  return (
    <Page>
      <Page.Header size="content">
        <Page.TitleGroup className="flex items-center">
          <BackButton onPress={goBack} />
          <div className="min-w-0">
            <Page.Title>{intake?.form_template.name ?? 'Intake'}</Page.Title>
            {submission?.submitted_at && (
              <Page.Description>Submitted {formatDayMonth(submission.submitted_at.slice(0, 10))}</Page.Description>
            )}
          </div>
        </Page.TitleGroup>
      </Page.Header>
      <Page.Content bare>
        <Page.Frame
          className="pt-4 pb-6"
          size="content"
        >
          {questionCount > 0 ? (
            // Same flat register as CD-CS: the design reads an intake as a
            // conversation — question, answer, next — not as a stack of carded
            // tables. Section titles stay as an eyebrow above their group.
            <div className="flex flex-col gap-6">
              {sections.map((section, index) => (
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
                      value={submission?.answers[question.id]}
                      weightUnit="kg"
                    />
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <SectionCard>
              <EmptyState
                body={
                  intake
                    ? 'The intake form has been assigned but not submitted.'
                    : 'No intake form has been assigned to this client.'
                }
                icon={ClipboardList}
                title="No intake yet"
              />
            </SectionCard>
          )}
        </Page.Frame>
      </Page.Content>
    </Page>
  );
}

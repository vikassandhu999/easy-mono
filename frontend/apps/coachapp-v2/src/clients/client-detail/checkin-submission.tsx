/**
 * CS — check-in submission detail (spec §6.5; design data-ref CD-CS-*).
 * A focused page at /clients/:id/check-ins/:assignmentId that renders the
 * submission's answers in question order and flips it to reviewed.
 * Style fidelity: manifests/CD-CS.json.
 */
import {Button, Chip, toast} from '@heroui/react';
import {ArrowLeft} from 'lucide-react';
import {useMemo, useState} from 'react';
import {useParams} from 'react-router-dom';
import {ErrorState} from '@/@components/error-state';
import {Page} from '@/@components/page';
import {PageSkeleton} from '@/@components/page-skeleton';
import {ROUTES} from '@/@config/routes';
import useAttachmentDownloadUrls from '@/@hooks/use-attachment-download-urls';
import {useGoBack} from '@/@hooks/use-go-back';
import {useListClientFormAssignmentsForCoachQuery, useReviewFormSubmissionMutation} from '@/api/checkins';
import type {ClientProfileFormSubmission} from '@/api/generated';
import {getApiErrorMessage} from '@/api/shared';
import {formatShortDate} from '@/clients/client-detail/cd-data';
import {CD_BTN_A, CD_CHIP, CdPhotoThumb} from '@/clients/client-detail/cd-ui';

const Q_LABEL = 'mb-1.75 text-eyebrow font-semibold text-muted sm:mb-2 sm:text-chip';
const VALUE = 'font-grotesk text-metric font-bold sm:text-answer';

type Question = {id: string; label: string; type: string};

function questionsOf(submission: ClientProfileFormSubmission): Question[] {
  return (Array.isArray(submission.question_snapshot) ? submission.question_snapshot : []).flatMap((section) =>
    Array.isArray(section.questions) ? (section.questions as Question[]) : [],
  );
}

function submittedAt(iso: string): string {
  const date = new Date(iso);
  const time = date
    .toLocaleTimeString('en-GB', {hour: 'numeric', hour12: true, minute: '2-digit'})
    .replace(/\s?(am|pm)/i, (m) => ` ${m.trim().toLowerCase()}`);
  return `Submitted ${formatShortDate(iso)}, ${time}`;
}

function RatingAnswer({value}: {value: number}) {
  return (
    <div className="flex items-center gap-2.25 sm:gap-2.5">
      <span
        className={VALUE}
        data-testid="cs-rating-value"
      >
        {value}/5
      </span>
      <span className="flex gap-1">
        {Array.from({length: 5}, (_, i) => (
          <span
            className={`size-2.25 rounded-pill ${i < value ? 'bg-accent' : 'bg-surface-tertiary'}`}
            data-testid={i === 0 ? 'cs-dot-on' : i === 4 ? 'cs-dot-off' : undefined}
            key={i}
          />
        ))}
      </span>
    </div>
  );
}

function PhotoAnswer({ids}: {ids: string[]}) {
  const {urls} = useAttachmentDownloadUrls(ids);
  return (
    <div className="flex flex-wrap gap-2.5">
      {ids.map((id) => (
        <CdPhotoThumb
          className="flex h-30 w-24 flex-none items-center justify-center overflow-hidden rounded-cd-panel bg-surface-tertiary text-muted/60 sm:h-35 sm:w-27.5"
          iconClassName="size-5 sm:size-6"
          key={id}
          src={urls[id]}
          testId="cs-photo"
        />
      ))}
    </div>
  );
}

function Answer({question, value}: {question: Question; value: unknown}) {
  if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) {
    return <div className={VALUE}>—</div>;
  }
  switch (question.type) {
    case 'boolean':
      return <div className={VALUE}>{value ? 'Yes' : 'No'}</div>;
    case 'date':
      return <div className={VALUE}>{formatShortDate(String(value))}</div>;
    case 'multi_select':
      return (
        <div className="flex flex-wrap gap-1.75">
          {(value as string[]).map((option) => (
            <Chip
              className={`${CD_CHIP} border border-border bg-transparent font-semibold [color:var(--color-muted)]`}
              key={option}
            >
              {option}
            </Chip>
          ))}
        </div>
      );
    case 'photo':
      return <PhotoAnswer ids={value as string[]} />;
    case 'rating':
      return <RatingAnswer value={Number(value)} />;
    case 'select':
      return (
        <Chip className={`${CD_CHIP} border border-border bg-transparent font-semibold [color:var(--color-muted)]`}>
          {String(value)}
        </Chip>
      );
    case 'weight':
      return (
        <div className="flex items-baseline gap-2 sm:gap-2.25">
          <span
            className={VALUE}
            data-testid="cs-weight-value"
          >
            {Number(value).toFixed(1)} kg
          </span>
          <span
            className="text-eyebrow text-muted sm:text-chip"
            data-testid="cs-weight-caption"
          >
            Saved to weight log
          </span>
        </div>
      );
    default:
      return (
        <div
          className="text-note leading-relaxed sm:text-row"
          data-testid="cs-text-answer"
        >
          {String(value)}
        </div>
      );
  }
}

export default function CheckinSubmission() {
  const {assignmentId, id} = useParams<{assignmentId: string; id: string}>();
  const goBack = useGoBack(`${ROUTES.CLIENT_DETAIL.replace(':id', id!)}?tab=check-ins`);
  const {data, isError, isLoading, refetch} = useListClientFormAssignmentsForCoachQuery({clientId: id!});
  const [review, {isLoading: isReviewing}] = useReviewFormSubmissionMutation();
  const [justReviewedAt, setJustReviewedAt] = useState<null | string>(null);

  const assignment = data?.data.find((a) => a.id === assignmentId);
  const submission = assignment?.latest_submission ?? null;
  const questions = useMemo(() => (submission ? questionsOf(submission) : []), [submission]);

  if (isLoading) {
    return (
      <Page className="bg-surface">
        <Page.Content bare>
          <Page.Frame className="pt-4 pb-6">
            <PageSkeleton />
          </Page.Frame>
        </Page.Content>
      </Page>
    );
  }

  if (isError || !assignment || !submission) {
    return (
      <Page className="bg-surface">
        <Page.Content bare>
          <Page.Frame className="pt-4 pb-6">
            <ErrorState
              message="This check-in couldn't load. It may have been removed."
              onRetry={refetch}
            />
          </Page.Frame>
        </Page.Content>
      </Page>
    );
  }

  const reviewedAt = submission.reviewed_at ?? justReviewedAt;

  const markReviewed = async () => {
    try {
      await review({id: submission.id}).unwrap();
      setJustReviewedAt(new Date().toISOString());
      toast.success('Check-in reviewed');
    } catch (err) {
      toast.danger(getApiErrorMessage(err, "Check-in wasn't marked reviewed"));
    }
  };

  return (
    <Page className="bg-surface text-foreground [line-height:normal]">
      <Page.Content
        bare
        className="flex flex-col p-0"
      >
        <div className="flex flex-none items-center gap-2.75 border-b border-border px-4 pt-0.5 pb-3.25 sm:gap-3.5 sm:px-7.5 sm:py-4.5">
          <Button
            aria-label="Back"
            className="size-8.5 min-h-0 min-w-0 rounded-cd-panel border border-border bg-surface px-1.5 py-px text-foreground [box-shadow:none] [column-gap:normal] [font-family:Arial] [font-size:13.3333px] [row-gap:normal] font-normal leading-[normal] sm:size-9.5"
            data-testid="cs-back"
            isIconOnly
            onPress={goBack}
            variant="ghost"
          >
            <ArrowLeft className="size-4 sm:size-4.25" />
          </Button>
          <div className="min-w-0 flex-1">
            <div
              className="font-grotesk text-metric-sm font-semibold sm:text-stat-lg"
              data-testid="cs-title"
            >
              {assignment.form_template.name}
            </div>
            <div
              className="text-eyebrow text-muted sm:mt-0.5 sm:text-sub"
              data-testid="cs-sub"
            >
              {submittedAt(submission.submitted_at)}
            </div>
          </div>
          {reviewedAt ? (
            <Chip
              className={`${CD_CHIP} border border-border bg-transparent font-semibold [color:var(--color-muted)]`}
              data-testid="cs-chip-reviewed"
            >
              Reviewed
            </Chip>
          ) : (
            <Chip
              className={`${CD_CHIP} bg-warning-soft [color:var(--color-warning-soft-foreground)]`}
              data-testid="cs-chip-needs"
            >
              Needs review
            </Chip>
          )}
        </div>

        <div
          className="flex flex-1 flex-col gap-4.5 overflow-y-auto bg-surface p-4 sm:max-w-180 sm:gap-6 sm:bg-transparent sm:px-7.5 sm:py-6"
          data-testid="cs-body"
        >
          {questions.map((question) => (
            <div key={question.id}>
              <div
                className={Q_LABEL}
                data-testid="cs-q-label"
              >
                {question.label}
              </div>
              <Answer
                question={question}
                value={submission.answers[question.id]}
              />
            </div>
          ))}
        </div>

        <div
          className="flex-none border-t border-border px-4 py-3.5 sm:px-7.5 sm:py-4"
          data-testid="cs-footer"
        >
          {reviewedAt ? (
            <div
              className="text-center text-pill font-medium text-muted"
              data-testid="cs-reviewed-note"
            >
              Reviewed {formatShortDate(reviewedAt)} · by you
            </div>
          ) : (
            <Button
              className={`${CD_BTN_A} h-11.5 w-full rounded-cd-panel px-3.75 text-tab`}
              data-testid="cs-review-btn"
              isPending={isReviewing}
              onPress={markReviewed}
            >
              Mark reviewed
            </Button>
          )}
        </div>
      </Page.Content>
    </Page>
  );
}

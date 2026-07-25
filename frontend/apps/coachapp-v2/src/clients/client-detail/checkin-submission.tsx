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
import {formatShortDate} from '@/clients/client-detail/data';
import {ACCENT_BUTTON, CHIP, PhotoThumb} from '@/clients/client-detail/ui';

const Q_LABEL = 'mb-2 type-eyebrow font-semibold text-muted';
const VALUE = 'font-grotesk type-title font-bold';

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
    <div className="flex items-center gap-2">
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
    <div className="flex flex-wrap gap-2">
      {ids.map((id) => (
        <PhotoThumb
          className="flex h-30 w-24 flex-none items-center justify-center overflow-hidden rounded-panel bg-surface-tertiary text-muted/60 sm:h-35 sm:w-27.5"
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
        <div className="flex flex-wrap gap-2">
          {(value as string[]).map((option) => (
            <Chip
              className={`${CHIP} border border-border bg-transparent font-semibold [color:var(--color-muted)]`}
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
        <Chip className={`${CHIP} border border-border bg-transparent font-semibold [color:var(--color-muted)]`}>
          {String(value)}
        </Chip>
      );
    case 'weight':
      return (
        <div className="flex items-baseline gap-2">
          <span
            className={VALUE}
            data-testid="cs-weight-value"
          >
            {Number(value).toFixed(1)} kg
          </span>
          <span
            className="type-eyebrow text-muted"
            data-testid="cs-weight-caption"
          >
            Saved to weight log
          </span>
        </div>
      );
    default:
      return (
        <div
          className="type-body leading-relaxed"
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
        <div className="flex flex-none items-center gap-3 border-b border-border px-4 pt-0.5 pb-3 sm:px-8 sm:py-4">
          <Button
            aria-label="Back"
            className="size-8.5 min-h-0 min-w-0 rounded-panel border border-border bg-surface px-1.5 py-px text-foreground [column-gap:normal] [row-gap:normal] font-normal leading-[normal] sm:size-9.5"
            data-testid="cs-back"
            isIconOnly
            onPress={goBack}
            variant="ghost"
          >
            <ArrowLeft />
          </Button>
          <div className="min-w-0 flex-1">
            <div
              className="font-grotesk type-body font-semibold sm:type-heading"
              data-testid="cs-title"
            >
              {assignment.form_template.name}
            </div>
            <div
              className="type-eyebrow text-muted sm:mt-0.5"
              data-testid="cs-sub"
            >
              {submittedAt(submission.submitted_at)}
            </div>
          </div>
          {reviewedAt ? (
            <Chip
              className={`${CHIP} border border-border bg-transparent font-semibold [color:var(--color-muted)]`}
              data-testid="cs-chip-reviewed"
            >
              Reviewed
            </Chip>
          ) : (
            <Chip
              className={`${CHIP} bg-warning-soft [color:var(--color-warning-soft-foreground)]`}
              data-testid="cs-chip-needs"
            >
              Needs review
            </Chip>
          )}
        </div>

        <div
          className="flex flex-1 flex-col gap-4 overflow-y-auto bg-surface p-4 sm:max-w-180 sm:gap-6 sm:bg-transparent sm:px-8 sm:py-6"
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
          className="flex-none border-t border-border px-4 py-3 sm:px-8 sm:py-4"
          data-testid="cs-footer"
        >
          {reviewedAt ? (
            <div
              className="text-center type-eyebrow font-medium text-muted"
              data-testid="cs-reviewed-note"
            >
              Reviewed {formatShortDate(reviewedAt)} · by you
            </div>
          ) : (
            <Button
              className={`${ACCENT_BUTTON}  w-full rounded-panel px-4 type-body`}
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

/**
 * IR — intake responses (spec §7.7; design data-ref CD-IR-*). The client's
 * onboarding intake, read-only, in question order.
 * Style fidelity: manifests/CD-IR.json.
 */
import {Chip} from '@heroui/react';
import {useParams} from 'react-router-dom';

import {ErrorState} from '@/@components/error-state';
import {Page} from '@/@components/page';
import {PageSkeleton} from '@/@components/page-skeleton';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {useListClientFormAssignmentsForCoachQuery} from '@/api/checkins';
import {formatShortDate, snapshotQuestions} from '@/clients/client-detail/data';
import {CHIP, SubHeader} from '@/clients/client-detail/ui';

const OUT_CHIP = `${CHIP} border border-border bg-transparent font-semibold [color:var(--color-muted)]`;
const LABEL = 'mb-1.5 text-eyebrow font-semibold text-muted sm:mb-1.75 sm:text-chip';
const TEXT = 'text-note leading-relaxed sm:text-row';

export default function IntakeResponses() {
  const {id} = useParams<{id: string}>();
  const goBack = useGoBack(ROUTES.CLIENT_DETAIL.replace(':id', id!));
  const {data, isError, isLoading, refetch} = useListClientFormAssignmentsForCoachQuery({clientId: id!});

  if (isLoading) {
    return (
      <Page className="bg-background">
        <Page.Content bare>
          <Page.Frame className="pt-4 pb-6">
            <PageSkeleton />
          </Page.Frame>
        </Page.Content>
      </Page>
    );
  }

  const intake = data?.data.find((assignment) => assignment.purpose === 'intake');
  const submission = intake?.latest_submission;

  if (isError || !submission) {
    return (
      <Page className="bg-background">
        <Page.Content bare>
          <Page.Frame className="pt-4 pb-6">
            <ErrorState
              message={isError ? "Couldn't load the intake." : 'This client has no submitted intake yet.'}
              onRetry={refetch}
            />
          </Page.Frame>
        </Page.Content>
      </Page>
    );
  }

  const questions = snapshotQuestions(submission.question_snapshot);

  return (
    <Page className="bg-background text-foreground [line-height:normal]">
      <Page.Content
        bare
        className="flex flex-col p-0"
      >
        <SubHeader
          onBack={goBack}
          subtitle={`Submitted ${formatShortDate(submission.submitted_at)}`}
          title="Intake"
        />
        <div className="p-4 sm:px-7.5 sm:pt-6 sm:pb-7.5">
          <div
            className="flex flex-col gap-4.5 sm:max-w-180 sm:gap-5.5"
            data-testid="ir-root"
          >
            {questions.map((question, index) => {
              const value = question.id ? submission.answers[question.id] : undefined;
              const isFirst = index === 0;
              return (
                <div key={question.id}>
                  <div
                    className={LABEL}
                    data-testid={isFirst ? 'ir-q-label' : undefined}
                  >
                    {question.label}
                  </div>
                  {Array.isArray(value) ? (
                    <div className="flex flex-wrap gap-1.5 sm:gap-1.75">
                      {value.map((option) => (
                        <Chip
                          className={OUT_CHIP}
                          key={String(option)}
                        >
                          {String(option)}
                        </Chip>
                      ))}
                    </div>
                  ) : (
                    <div
                      className={TEXT}
                      data-testid={isFirst ? 'ir-text' : undefined}
                    >
                      {value == null || value === '' ? '—' : String(value)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Page.Content>
    </Page>
  );
}

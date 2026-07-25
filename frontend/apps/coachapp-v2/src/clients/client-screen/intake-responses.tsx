import {Typography} from '@heroui/react';
import {useParams} from 'react-router-dom';

import {BackButton} from '@/@components/back-button';
import {ErrorState} from '@/@components/error-state';
import {Page} from '@/@components/page';
import {PageSkeleton} from '@/@components/page-skeleton';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {useListClientFormAssignmentsForCoachQuery} from '@/api/generated';
import {SectionCard} from '@/clients/components/section-card';
import {formatDayMonth} from '@/clients/lib/client-detail-data';

/**
 * CD-IR — the intake answers, read-only.
 *
 * Questions come from `question_snapshot.questions` on the submission, not from
 * the live template: a template edited after submission must not relabel answers
 * that were given against the old wording. The snapshot exists for exactly this.
 */
export default function IntakeResponses() {
  const {id = ''} = useParams<{id: string}>();
  const goBack = useGoBack(ROUTES.CLIENT_DETAIL.replace(':id', id));
  const {data, isError, isLoading, refetch} = useListClientFormAssignmentsForCoachQuery({clientId: id});

  const header = (
    <Page.Header size="content">
      <Page.TitleGroup className="flex items-center gap-1">
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
          <Page.Frame className="pt-4 pb-6">
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
          <Page.Frame className="pt-4 pb-6">
            <ErrorState
              message="Couldn't load intake responses."
              onRetry={refetch}
            />
          </Page.Frame>
        </Page.Content>
      </Page>
    );
  }

  const intake = data.data.find((a) => a.purpose === 'intake');
  const submission = intake?.latest_submission;
  // `question_snapshot` is an ARRAY OF SECTIONS, each with its own `questions` and
  // an optional title — not a flat question list, and not a `{sections: […]}`
  // wrapper. Rendering the sections keeps the answers in the order and grouping the
  // client actually filled them in.
  const sections = submission?.question_snapshot ?? [];
  const questionCount = sections.reduce((n, section) => n + (section.questions?.length ?? 0), 0);
  const answers = (submission?.answers ?? {}) as Record<string, unknown>;

  return (
    <Page>
      <Page.Header size="content">
        <Page.TitleGroup className="flex items-center gap-1">
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
        <Page.Frame className="pt-4 pb-6">
          {questionCount > 0 ? (
            <div className="flex flex-col gap-4">
              {sections.map((section, index) => (
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
            </div>
          ) : (
            <SectionCard>
              <div className="p-6 text-center">
                <Typography type="h5">No intake yet</Typography>
                <Typography
                  className="mt-1"
                  color="muted"
                  type="body-sm"
                >
                  {intake
                    ? 'The intake form has been assigned but not submitted.'
                    : 'No intake form has been assigned to this client.'}
                </Typography>
              </div>
            </SectionCard>
          )}
        </Page.Frame>
      </Page.Content>
    </Page>
  );
}

/**
 * Answers are `unknown` per question type. Multi-select arrives as an array (the
 * design shows "Mon · Wed · Fri · Sat" for days available), booleans as yes/no,
 * and an unanswered question as an em dash rather than a blank row.
 */
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

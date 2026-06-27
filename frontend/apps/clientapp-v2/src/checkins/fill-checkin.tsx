import {formatIsoDateOnly} from '@easy/utils';
import {Button, Spinner, toast} from '@heroui/react';
import {ArrowLeft, CheckCircle2} from 'lucide-react';
import {useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';

import PageLayout from '@/@components/page-layout';
import {ROUTES} from '@/@config/routes';
import {
  type ClientProfileFormAssignment,
  useGetClientFormAssignmentQuery,
  useSubmitClientFormAssignmentMutation,
} from '@/api/checkins';
import CheckinField, {type AnswerValue, type CheckinQuestion} from '@/checkins/checkin-field';

type Section = {questions?: CheckinQuestion[]; title?: string};

function isEmpty(value: AnswerValue | undefined): boolean {
  if (value == null || value === '') {
    return true;
  }
  return Array.isArray(value) && value.length === 0;
}

function BackButton({onPress}: {onPress: () => void}) {
  return (
    <div className="mb-4">
      <Button
        onPress={onPress}
        size="sm"
        variant="ghost"
      >
        <ArrowLeft size={16} />
        Back
      </Button>
    </div>
  );
}

function FillForm({assignment}: {assignment: ClientProfileFormAssignment}) {
  const navigate = useNavigate();
  const goBack = () => navigate(ROUTES.CHECKINS);
  const [submit, {isLoading}] = useSubmitClientFormAssignmentMutation();
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [error, setError] = useState<null | string>(null);

  const sections = (assignment.form_template?.sections ?? []) as Section[];
  const questions = sections.flatMap((s) => s.questions ?? []);

  const handleSubmit = async () => {
    const missing = questions.some((q) => q.required && isEmpty(answers[q.id]));
    if (missing) {
      setError('Please answer all required questions.');
      return;
    }
    setError(null);

    // Only send answered questions.
    const payload: Record<string, unknown> = {};
    for (const q of questions) {
      if (!isEmpty(answers[q.id])) {
        payload[q.id] = answers[q.id];
      }
    }

    try {
      await submit({id: assignment.id, clientProfileFormSubmissionRequest: {answers: payload}}).unwrap();
      toast.success('Check-in submitted');
      navigate(ROUTES.CHECKINS);
    } catch {
      toast.danger("Couldn't submit. Please try again.");
    }
  };

  return (
    <PageLayout title={assignment.form_template?.name ?? 'Check-in'}>
      <div className="max-w-lg">
        <BackButton onPress={goBack} />

        <div className="flex flex-col gap-6">
          {sections.map((section, si) => (
            <section key={section.title ?? si}>
              {section.title ? <h2 className="mb-3 text-sm font-medium">{section.title}</h2> : null}
              <div className="flex flex-col gap-4">
                {(section.questions ?? []).map((question) => (
                  <CheckinField
                    key={question.id}
                    onChange={(value) => setAnswers((prev) => ({...prev, [question.id]: value}))}
                    question={question}
                    value={answers[question.id] ?? null}
                  />
                ))}
              </div>
            </section>
          ))}

          {error ? <p className="text-sm text-danger">{error}</p> : null}

          <Button
            isPending={isLoading}
            onPress={handleSubmit}
            variant="primary"
          >
            {isLoading ? 'Submitting…' : 'Submit check-in'}
          </Button>
        </div>
      </div>
    </PageLayout>
  );
}

function CompletedState({assignment}: {assignment: ClientProfileFormAssignment}) {
  const navigate = useNavigate();
  return (
    <PageLayout title={assignment.form_template?.name ?? 'Check-in'}>
      <div className="max-w-lg">
        <BackButton onPress={() => navigate(ROUTES.CHECKINS)} />
        <div className="rounded-xl border border-border bg-surface p-8 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-success/10">
            <CheckCircle2
              className="text-success"
              size={24}
            />
          </div>
          <h3 className="text-base font-medium">Check-in submitted</h3>
          <p className="mt-2 text-sm text-muted">
            {assignment.completed_at
              ? `You completed this on ${formatIsoDateOnly(assignment.completed_at)}.`
              : 'Thanks — your coach has your answers.'}
          </p>
        </div>
      </div>
    </PageLayout>
  );
}

export default function FillCheckin() {
  const {id} = useParams<{id: string}>();
  const navigate = useNavigate();
  const {data, isError, isLoading} = useGetClientFormAssignmentQuery({id: id!});

  if (isLoading || !data) {
    return (
      <PageLayout title="Check-in">
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      </PageLayout>
    );
  }

  if (isError) {
    return (
      <PageLayout title="Check-in">
        <div className="max-w-lg">
          <BackButton onPress={() => navigate(ROUTES.CHECKINS)} />
          <div className="rounded-xl border border-border bg-surface p-6 text-center">
            <p className="text-sm text-danger">Check-in couldn&apos;t load.</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  const assignment = data.data;
  return assignment.status === 'completed' ? (
    <CompletedState assignment={assignment} />
  ) : (
    <FillForm assignment={assignment} />
  );
}

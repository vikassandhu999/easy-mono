import {formatIsoDateOnly} from '@easy/utils';
import {Button, Skeleton, toast} from '@heroui/react';
import {ArrowLeft, CheckCircle2, CircleX} from 'lucide-react';
import {useCallback, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import {
  type ClientProfileFormAssignment,
  type ClientProfileFormSubmissionRequest,
  PURPOSE_LABELS,
  useGetClientFormAssignmentQuery,
  useSubmitClientFormAssignmentMutation,
} from '@/api/checkins';
import {useGetClientProfileQuery} from '@/api/profile';
import CheckinField, {type AnswerValue, type CheckinQuestion} from '@/checkins/checkin-field';
import type {PhotoUploadState} from '@/checkins/photo-answer-field';
import {ROUTES} from '@/routes';
import ErrorState from '@/ui/error-state';
import PageLayout from '@/ui/page-layout';
import useAttachmentDownloadUrls from '@/ui/use-attachment-download-urls';

type Section = ClientProfileFormAssignment['form_template']['sections'][number];

function purposeLabel(purpose: ClientProfileFormAssignment['purpose']): string {
  return PURPOSE_LABELS[purpose] ?? 'Form';
}

function visibleQuestions<T extends {type: string}>(
  purpose: ClientProfileFormAssignment['purpose'],
  questions: T[],
): T[] {
  return questions.filter((question) => purpose === 'intake' || question.type !== 'service_type');
}

function isEmpty(value: AnswerValue | undefined): boolean {
  if (value == null || value === '') {
    return true;
  }
  if (!Array.isArray(value) && typeof value === 'object' && 'services' in value) {
    return false;
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
  const submit = useSubmitClientFormAssignmentMutation();
  const isLoading = submit.isPending;
  const {data: profileData} = useGetClientProfileQuery();
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [error, setError] = useState<null | string>(null);
  const [photoUploadStates, setPhotoUploadStates] = useState<Record<string, PhotoUploadState>>({});

  const sections = (assignment.form_template?.sections ?? []) as Section[];
  const questions = visibleQuestions(
    assignment.purpose,
    sections.flatMap((s) => s.questions ?? []),
  );
  const weightUnit = (profileData?.data.goal_weight_unit ?? profileData?.data.default_weight_unit ?? 'kg') as
    | 'kg'
    | 'lbs';
  const photoUploadBusy = Object.values(photoUploadStates).some((state) => state.busy);
  const photoUploadFailed = Object.values(photoUploadStates).some((state) => state.failed);

  const updateAnswer = useCallback((questionId: string, value: AnswerValue) => {
    setAnswers((current) => ({...current, [questionId]: value}));
    setError(null);
  }, []);

  const updatePhotoUploadState = useCallback((questionId: string, state: PhotoUploadState) => {
    setPhotoUploadStates((current) => {
      const previous = current[questionId];
      if (previous?.busy === state.busy && previous.failed === state.failed) {
        return current;
      }
      return {...current, [questionId]: state};
    });
  }, []);

  const handleSubmit = async () => {
    if (photoUploadBusy) {
      setError('Wait for your photos to finish uploading.');
      return;
    }
    if (photoUploadFailed) {
      setError('Remove failed photos before submitting.');
      return;
    }
    const missing = questions.some((q) => q.required && isEmpty(answers[q.id]));
    if (missing) {
      setError('Please answer all required questions.');
      return;
    }
    const invalidWeight = questions.some((question) => {
      const value = answers[question.id];
      return (
        question.type === 'weight' && !isEmpty(value) && (typeof value !== 'number' || value <= 0 || value >= 1000)
      );
    });
    if (invalidWeight) {
      setError('Enter a weight greater than 0 and below 1000.');
      return;
    }
    setError(null);

    // Only send answered questions.
    const payload: ClientProfileFormSubmissionRequest['answers'] = {};
    for (const q of questions) {
      const answer = answers[q.id];
      if (!isEmpty(answer) && answer != null) {
        payload[q.id] = answer;
      }
    }

    try {
      await submit.mutateAsync({id: assignment.id, answers: payload});
      toast.success(`${purposeLabel(assignment.purpose)} submitted`);
      navigate(ROUTES.CHECKINS);
    } catch {
      toast.danger("Couldn't submit. Please try again.");
    }
  };

  return (
    <PageLayout title={assignment.form_template?.name ?? purposeLabel(assignment.purpose)}>
      <div className="max-w-lg">
        <BackButton onPress={goBack} />

        <div className="flex flex-col gap-6">
          {sections.map((section, si) => (
            <section key={section.title ?? si}>
              {section.title ? <h2 className="mb-3 text-sm font-medium">{section.title}</h2> : null}
              <div className="flex flex-col gap-4">
                {visibleQuestions(assignment.purpose, section.questions ?? []).map((question) => (
                  <CheckinField
                    key={question.id}
                    onChange={(value) => updateAnswer(question.id, value)}
                    question={question}
                    value={answers[question.id] ?? null}
                    weightUnit={weightUnit}
                    onUploadStateChange={(state) => updatePhotoUploadState(question.id, state)}
                  />
                ))}
              </div>
            </section>
          ))}

          {error ? <p className="text-sm text-danger">{error}</p> : null}

          <Button
            isDisabled={photoUploadBusy || photoUploadFailed}
            isPending={isLoading}
            onPress={handleSubmit}
            variant="primary"
          >
            {isLoading ? 'Submitting…' : `Submit ${purposeLabel(assignment.purpose).toLowerCase()}`}
          </Button>
        </div>
      </div>
    </PageLayout>
  );
}

function CompletedState({assignment}: {assignment: ClientProfileFormAssignment}) {
  const navigate = useNavigate();
  const submission = assignment.latest_submission;
  const photoIds = submission?.attachments.map((attachment) => attachment.id) ?? [];
  const {urls: photoUrls} = useAttachmentDownloadUrls(photoIds);
  const sections = submission?.question_snapshot ?? [];

  const formatAnswer = (question: CheckinQuestion, answer: unknown) => {
    if (question.type === 'boolean') {
      return answer === true ? 'Yes' : 'No';
    }
    if (
      question.type === 'service_type' &&
      answer &&
      !Array.isArray(answer) &&
      typeof answer === 'object' &&
      'services' in answer &&
      Array.isArray(answer.services)
    ) {
      return answer.services.map((service) => (service === 'training' ? 'Training' : 'Nutrition')).join(' · ');
    }
    if (Array.isArray(answer)) {
      return answer.join(', ');
    }
    if (question.type === 'weight' && (typeof answer === 'number' || typeof answer === 'string')) {
      return `${answer} kg`;
    }
    return String(answer ?? 'Not answered');
  };

  return (
    <PageLayout title={assignment.form_template?.name ?? purposeLabel(assignment.purpose)}>
      <div className="max-w-lg">
        <BackButton onPress={() => navigate(ROUTES.CHECKINS)} />
        <div className="rounded-xl border border-border bg-surface p-8 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-success/10">
            <CheckCircle2
              className="text-success"
              size={24}
            />
          </div>
          <h3 className="text-base font-medium">{`${purposeLabel(assignment.purpose)} submitted`}</h3>
          <p className="mt-2 text-sm text-muted">
            {assignment.completed_at
              ? `You completed this on ${formatIsoDateOnly(assignment.completed_at)}.`
              : 'Thanks — your coach has your answers.'}
          </p>
        </div>
        {submission ? (
          <div className="mt-4 space-y-4 rounded-xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-extrabold">Your answers</h3>
              <span className="text-[11px] font-semibold text-muted">
                {submission.reviewed_at ? 'Reviewed by your coach' : 'Awaiting coach review'}
              </span>
            </div>
            {visibleQuestions(
              assignment.purpose,
              sections.flatMap((section) => section.questions),
            ).map((question) => {
              const answer = submission.answers[question.id];
              const ids = question.type === 'photo' && Array.isArray(answer) ? answer.map(String) : [];
              return (
                <div
                  className="border-t border-separator pt-3 first:border-0 first:pt-0"
                  key={question.id}
                >
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">{question.label}</p>
                  {ids.length > 0 ? (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {ids.map((id) =>
                        photoUrls[id] ? (
                          <img
                            alt="Check-in upload"
                            className="aspect-[3/4] w-full rounded-xl object-cover"
                            key={id}
                            src={photoUrls[id]}
                          />
                        ) : (
                          <div
                            className="grid aspect-[3/4] place-items-center rounded-xl bg-surface-secondary text-xs text-muted"
                            key={id}
                          >
                            Loading photo…
                          </div>
                        ),
                      )}
                    </div>
                  ) : (
                    <p className="mt-1 text-sm font-semibold">{formatAnswer(question, answer)}</p>
                  )}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </PageLayout>
  );
}

function ClosedState({assignment}: {assignment: ClientProfileFormAssignment}) {
  const navigate = useNavigate();
  const missed = assignment.status === 'missed';
  const noun = purposeLabel(assignment.purpose).toLowerCase();
  return (
    <PageLayout title={assignment.form_template?.name ?? purposeLabel(assignment.purpose)}>
      <div className="max-w-lg">
        <BackButton onPress={() => navigate(ROUTES.CHECKINS)} />
        <div className="rounded-xl border border-border bg-surface p-8 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-danger/10">
            <CircleX
              className="text-danger"
              size={24}
            />
          </div>
          <h3 className="text-base font-medium">
            {missed ? `${purposeLabel(assignment.purpose)} missed` : `${purposeLabel(assignment.purpose)} closed`}
          </h3>
          <p className="mt-2 text-sm text-muted">
            {missed
              ? `This ${noun} is no longer open. Complete the latest one from your list.`
              : `This ${noun} was closed by your coach.`}
          </p>
        </div>
      </div>
    </PageLayout>
  );
}

export default function FillCheckin() {
  const {id} = useParams<{id: string}>();
  const navigate = useNavigate();
  const {data, isError, isLoading, refetch} = useGetClientFormAssignmentQuery(id ?? '', {enabled: Boolean(id)});

  if (isLoading) {
    return (
      <PageLayout title="Check-in">
        <div className="max-w-lg space-y-6">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <div className="space-y-4 rounded-xl border border-border bg-surface p-4">
            <Skeleton className="h-4 w-28 rounded" />
            <Skeleton className="h-11 w-full rounded-lg" />
            <Skeleton className="h-11 w-full rounded-lg" />
          </div>
        </div>
      </PageLayout>
    );
  }

  if (isError || !data) {
    return (
      <PageLayout title="Check-in">
        <div className="max-w-lg">
          <BackButton onPress={() => navigate(ROUTES.CHECKINS)} />
          <ErrorState
            message="Couldn't load this check-in."
            onRetry={() => refetch()}
          />
        </div>
      </PageLayout>
    );
  }

  const assignment = data.data;
  if (assignment.status === 'completed') {
    return <CompletedState assignment={assignment} />;
  }
  if (assignment.status === 'missed' || assignment.status === 'dismissed') {
    return <ClosedState assignment={assignment} />;
  }
  return <FillForm assignment={assignment} />;
}

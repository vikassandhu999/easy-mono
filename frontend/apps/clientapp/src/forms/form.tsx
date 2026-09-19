import {useCallback, useEffect, useState} from 'react';
import {useForm} from 'react-hook-form';
import {Link, useParams, useSearchParams} from 'react-router-dom';
import {useProfile} from '../api/auth';
import {ApiError, errorMessage} from '../api/client';
import {readDraft, removeDraft} from '../api/drafts';
import {
  FormAlreadySubmittedError,
  type FormAssignment,
  type FormAssignmentAnswer,
  type FormWeightUnit,
  useFormAssignment,
  useSubmitForm,
} from '../api/forms';
import {clearFormPhotos, readPhotos} from '../api/photo-store';
import {getSession} from '../api/session';
import {routes} from '../routes';
import {Button} from '../ui/button';
import {DraftStatus, useDraftWriter} from '../ui/draft-status';
import {FormError} from '../ui/form-error';
import {Page} from '../ui/page';
import {SubmitButton} from '../ui/submit-button';
import {
  answerText,
  type DraftAnswer,
  type FormDraft,
  type FormValues,
  hasAnswer,
  parseFormDraft,
  questionShape,
  submissionAnswers,
} from './answers';
import {SavedPhotos} from './photos';
import {Question} from './question';

export function FormDetail() {
  const {id = ''} = useParams();
  const [params] = useSearchParams();
  const back = params.get('from') === 'history' ? `${routes.forms}?state=history` : routes.forms;
  const query = useFormAssignment(id);
  const profile = useProfile();
  if (!query.data || !profile.data) {
    return (
      <Page
        title="Your form"
        back={back}
      >
        {query.isError || profile.isError ? (
          <>
            <FormError message="Your form could not be loaded. Your draft is still on this device." />
            <Button
              onPress={() => {
                query.refetch();
                profile.refetch();
              }}
            >
              Try again
            </Button>
          </>
        ) : (
          <p role="status">Opening your form…</p>
        )}
      </Page>
    );
  }
  const assignment = query.data.data;
  if (assignment.status !== 'assigned' && assignment.status !== 'in_progress') {
    const saved = assignment.latest_submission;
    return (
      <Page
        title={assignment.form_template.name}
        description={
          saved
            ? `Response saved ${new Date(saved.submitted_at).toLocaleString()}`
            : assignment.status === 'missed'
              ? 'This request was missed.'
              : 'Your coach has closed this request.'
        }
        back={back}
      >
        <UnsentAnswers assignmentId={assignment.id} />
        {saved ? (
          <div className="space-y-8">
            {saved.question_snapshot.map((section, sectionIndex) => (
              <section
                key={sectionIndex}
                className="space-y-5"
              >
                {(section.title || section.section) && (
                  <h2 className="text-xl font-semibold">{section.title || section.section}</h2>
                )}
                <dl className="space-y-5">
                  {section.questions.map((question) => (
                    <div key={question.id}>
                      <dt className="font-medium">
                        {question.label}
                        {question.type === 'weight' && ` (${question.unit ?? 'unit not recorded'})`}
                      </dt>
                      <dd className="mt-1 whitespace-pre-wrap text-muted-foreground">
                        <SavedAnswer
                          photo={question.type === 'photo'}
                          value={saved.answers[question.id]}
                        />
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        ) : (
          <p>You can ask your coach for a new request if you still need to respond.</p>
        )}
        <Link
          to={back}
          className="text-link mt-8 block"
        >
          Back to your forms
        </Link>
      </Page>
    );
  }
  return (
    <FormEditor
      key={`${assignment.id}:${assignment.form_template.revision}`}
      assignment={assignment}
      initialWeightUnit={query.data.weight_unit}
      back={back}
      refresh={() => query.refetch()}
    />
  );
}

function FormEditor({
  assignment,
  back,
  refresh,
  initialWeightUnit,
}: {
  assignment: FormAssignment;
  back: string;
  refresh: () => Promise<unknown>;
  initialWeightUnit: FormWeightUnit;
}) {
  const questions = assignment.form_template.sections.flatMap((section) => section.questions);
  const form = useForm<FormValues>({defaultValues: {answers: questions.map(() => '')}});
  const [session] = useState(getSession);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState('');
  const [weightUnit, setWeightUnit] = useState(initialWeightUnit);
  const [draftError, setDraftError] = useState('');
  const [previous, setPrevious] = useState<DraftAnswer[]>([]);
  const [photoWork, setPhotoWork] = useState<Record<string, boolean>>({});
  const onPhotoWork = useCallback(
    (resource: string, pending: boolean) =>
      setPhotoWork((current) => (current[resource] === pending ? current : {...current, [resource]: pending})),
    [],
  );
  const mutation = useSubmitForm(assignment.id);
  const resource = `form.${assignment.id}`;
  const {saveDraft, state: draftState} = useDraftWriter(session?.id, resource);
  // The keyed editor owns one template revision; a refresh remounts only when it changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: The keyed assignment snapshot is fixed for this editor.
  useEffect(() => {
    let active = true;
    if (!session) {
      return;
    }
    readDraft(session.id, resource)
      .then((raw) => {
        if (!active) {
          return;
        }
        const draft = parseFormDraft(raw);
        if (draft) {
          setWeightUnit(draft.weightUnit ?? initialWeightUnit);
          form.reset({
            answers: questions.map(
              (question) => draft.answers.find((entry) => entry.shape === questionShape(question))?.value ?? '',
            ),
          });
          const changed = draft.revision !== assignment.form_template.revision;
          setPrevious(
            changed
              ? [
                  ...draft.previous,
                  ...draft.answers.filter(
                    (entry) =>
                      hasAnswer(entry.value) && !questions.some((question) => entry.shape === questionShape(question)),
                  ),
                ]
              : draft.previous,
          );
          setNotice(
            changed
              ? 'Your coach updated this form. Review your answers before sending.'
              : 'Your unsent answers were restored.',
          );
        }
        setReady(true);
      })
      .catch(() => {
        if (active) {
          setDraftError('Your draft could not be opened. Reopen this screen to retry.');
        }
      });
    return () => {
      active = false;
    };
  }, [form, resource, session]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: The keyed assignment snapshot is fixed for this editor.
  useEffect(() => {
    if (!ready || !session) {
      return;
    }
    const subscription = form.watch(() => {
      const answers = form.getValues().answers;
      const draft = {
        revision: assignment.form_template.revision,
        weightUnit,
        previous,
        answers: questions.map((question, index) => ({
          id: question.id,
          label: question.label,
          shape: questionShape(question),
          photo: question.type === 'photo',
          value: answers[index] ?? '',
        })),
      };
      saveDraft(draft);
    });
    return () => subscription.unsubscribe();
  }, [ready, previous, form, resource, session, weightUnit, saveDraft]);
  const submit = form.handleSubmit(async (values) => {
    if (!session?.accountId) {
      return;
    }
    try {
      for (const question of questions) {
        if (question.type !== 'photo') {
          continue;
        }
        const photos = await readPhotos(session.accountId, `${resource}.${question.id}`);
        if (photos.some((photo) => !photo.attachmentId)) {
          throw new Error('Upload or remove your unfinished photos before sending.');
        }
      }
      await mutation.mutateAsync({
        answers: submissionAnswers(questions, values),
        expected_revision: assignment.form_template.revision,
        weight_unit: weightUnit,
      });
    } catch (error) {
      if (error instanceof ApiError && error.code === 'stale_revision') {
        await refresh();
      }
      form.setError('root', {
        message:
          error instanceof ApiError
            ? errorMessage(error, 'Your response could not be saved.')
            : error instanceof Error
              ? error.message
              : 'Your response could not be saved. Your answers are still here.',
      });
    }
  });
  const pendingPhotos = Object.values(photoWork).some(Boolean);
  return (
    <Page
      title={assignment.form_template.name}
      description="Your answers help your coach support you. Required questions are marked."
      back={back}
    >
      {notice && (
        <p
          role="status"
          className="mb-6 text-sm text-muted-foreground"
        >
          {notice}
        </p>
      )}
      {previous.length > 0 && (
        <details className="mb-6">
          <summary className="text-link cursor-pointer">Answers from the earlier form</summary>
          <dl className="space-y-3 py-4">
            {previous.map((entry, index) => (
              <div key={index}>
                <dt className="font-medium">{entry.label}</dt>
                <dd>
                  <SavedAnswer
                    photo={Boolean(entry.photo)}
                    value={entry.value}
                  />
                </dd>
              </div>
            ))}
          </dl>
        </details>
      )}
      {draftError && <FormError message={draftError} />}
      {!ready ? (
        <p role="status">Opening your draft…</p>
      ) : (
        <form
          noValidate
          onSubmit={submit}
          className="space-y-9"
        >
          {assignment.form_template.sections.map((section, sectionIndex) => (
            <section
              key={sectionIndex}
              className="space-y-7"
            >
              {section.title && <h2 className="text-xl font-semibold">{section.title}</h2>}
              {section.questions.map((question) => (
                <Question
                  key={question.id}
                  question={question}
                  index={questions.findIndex((item) => item.id === question.id)}
                  control={form.control}
                  disabled={form.formState.isSubmitting}
                  assignmentId={assignment.id}
                  onPhotoWork={onPhotoWork}
                  weightUnit={weightUnit}
                />
              ))}
            </section>
          ))}
          <FormError message={form.formState.errors.root?.message} />
          <DraftStatus state={draftState} />
          {mutation.error instanceof FormAlreadySubmittedError && (
            <Button onPress={() => refresh()}>Open saved response</Button>
          )}
          {pendingPhotos && (
            <p
              role="status"
              className="text-sm text-muted-foreground"
            >
              Upload or remove unfinished photos before sending.
            </p>
          )}
          <SubmitButton
            pending={form.formState.isSubmitting}
            isDisabled={pendingPhotos}
          >
            Send response
          </SubmitButton>
          <p className="text-sm text-muted-foreground">
            Your coach receives this form when you send it. Unsent answers stay on this device.
          </p>
        </form>
      )}
    </Page>
  );
}

function SavedAnswer({photo, value}: {photo: boolean; value: FormAssignmentAnswer | undefined}) {
  return photo && Array.isArray(value) ? <SavedPhotos ids={value} /> : answerText(value);
}

function UnsentAnswers({assignmentId}: {assignmentId: string}) {
  const [draft, setDraft] = useState<FormDraft | null>(null);
  const [error, setError] = useState('');
  const [session] = useState(getSession);
  const resource = `form.${assignmentId}`;
  useEffect(() => {
    let active = true;
    if (!session) {
      return;
    }
    readDraft(session.id, resource)
      .then((value) => {
        if (active) {
          setDraft(parseFormDraft(value));
        }
      })
      .catch(() => {
        if (active) {
          setError('Your unsent answers could not be opened. Reopen this screen to retry.');
        }
      });
    return () => {
      active = false;
    };
  }, [session, resource]);
  if (!draft) {
    return error ? <FormError message={error} /> : null;
  }
  return (
    <div className="mb-8 space-y-4">
      <p role="status">You also have unsent answers on this device. They have not replaced the saved response.</p>
      <details>
        <summary className="text-link cursor-pointer">Compare your unsent answers</summary>
        <dl className="space-y-4 py-4">
          {[...draft.answers, ...draft.previous]
            .filter((entry) => hasAnswer(entry.value))
            .map((entry, index) => (
              <div key={index}>
                <dt className="font-medium">{entry.label}</dt>
                <dd>
                  <SavedAnswer
                    photo={Boolean(entry.photo)}
                    value={entry.value}
                  />
                </dd>
              </div>
            ))}
        </dl>
      </details>
      <Button
        variant="outline"
        onPress={async () => {
          if (!session?.accountId) {
            return;
          }
          try {
            await Promise.all([removeDraft(session.id, resource), clearFormPhotos(session.accountId, `${resource}.`)]);
            setDraft(null);
          } catch {
            setError('Your unsent answers could not be removed. Please try again.');
          }
        }}
      >
        Discard unsent answers
      </Button>
      <FormError message={error} />
    </div>
  );
}

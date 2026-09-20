import {Check, ClipboardList, Sparkles} from 'lucide-react';
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
import {safeReturnTo} from '../auth/return-to';
import {routes} from '../routes';
import {Button} from '../ui/button';
import {CachedRead} from '../ui/cached-read';
import {useOnline} from '../ui/connection-status';
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
  const back = params.has('returnTo')
    ? safeReturnTo(params.get('returnTo'))
    : params.get('from') === 'history'
      ? `${routes.forms}?state=history`
      : routes.forms;
  const query = useFormAssignment(id);
  const profile = useProfile();
  const online = useOnline();
  if (!query.data || !profile.data) {
    return (
      <Page
        compact
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
          <p role="status">
            {online
              ? 'Opening your form…'
              : 'This form is not available offline. Reconnect to open it. Your draft is kept on this device.'}
          </p>
        )}
      </Page>
    );
  }
  const assignment = query.data.data;
  if (assignment.status !== 'assigned' && assignment.status !== 'in_progress') {
    const saved = assignment.latest_submission;
    return (
      <Page
        compact
        title={assignment.form_template.name}
        back={back}
      >
        <div className={`mb-6 rounded-3xl p-5 ${saved ? 'bg-[var(--progress)]' : 'bg-muted'}`}>
          <div className="mb-3 grid size-11 place-items-center rounded-2xl bg-white/70">
            {saved ? (
              <Check
                aria-hidden="true"
                className="size-5"
              />
            ) : (
              <ClipboardList
                aria-hidden="true"
                className="size-5"
              />
            )}
          </div>
          <p className="text-xl font-bold">
            {saved
              ? 'Response saved'
              : assignment.status === 'missed'
                ? 'This request was missed.'
                : 'Your coach has closed this request.'}
          </p>
          {saved && (
            <p className="mt-1 text-sm">{new Date(saved.submitted_at).toLocaleString()} · Shared with your coach</p>
          )}
        </div>
        <CachedRead
          updatedAt={query.dataUpdatedAt}
          failed={query.isError}
          refreshing={query.isFetching}
          refresh={() => query.refetch()}
        />
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
                <dl className="divide-y divide-border rounded-3xl bg-white px-5">
                  {section.questions.map((question) => (
                    <div
                      key={question.id}
                      className="py-5"
                    >
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
          className="mt-8 flex min-h-12 items-center justify-center rounded-2xl bg-primary px-4 font-semibold text-primary-foreground"
        >
          {back === routes.messages
            ? 'Back to messages'
            : back.startsWith(routes.progress)
              ? 'Back to your progress'
              : 'Back to your forms'}
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
      canSend={online && query.isFetchedAfterMount && !query.isError && !query.isFetching}
      checkedAt={query.dataUpdatedAt}
      refreshFailed={query.isError}
      refreshing={query.isFetching}
    />
  );
}

function FormEditor({
  assignment,
  back,
  refresh,
  initialWeightUnit,
  canSend,
  checkedAt,
  refreshFailed,
  refreshing,
}: {
  assignment: FormAssignment;
  back: string;
  refresh: () => Promise<unknown>;
  initialWeightUnit: FormWeightUnit;
  canSend: boolean;
  checkedAt: number;
  refreshFailed: boolean;
  refreshing: boolean;
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
    if (!session?.accountId || !canSend) {
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
      compact
      title={assignment.form_template.name}
      back={back}
    >
      <div className="mb-6 flex items-start gap-3 rounded-3xl bg-[var(--training)] p-5">
        <Sparkles
          aria-hidden="true"
          className="mt-1 size-5 shrink-0 text-primary"
        />
        <div>
          <p className="font-bold">
            {assignment.purpose === 'intake' ? 'Let’s get to know you' : 'Make a moment for you'}
          </p>
          <p className="mt-1 text-sm leading-relaxed">
            Your answers help your coach support you. Required questions are marked.
          </p>
        </div>
      </div>
      <CachedRead
        updatedAt={checkedAt}
        failed={refreshFailed}
        refreshing={refreshing}
        refresh={refresh}
      />
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
          <summary className="min-h-11 cursor-pointer py-3 font-semibold text-primary">
            Answers from the earlier form
          </summary>
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
          className="space-y-9 pb-24"
        >
          {assignment.form_template.sections.map((section, sectionIndex) => (
            <section
              key={sectionIndex}
              className="space-y-8"
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
          <DraftStatus state={draftState} />
          {pendingPhotos && (
            <p
              role="status"
              className="text-sm text-muted-foreground"
            >
              Upload or remove unfinished photos before sending.
            </p>
          )}
          {!canSend && (
            <p
              role="status"
              className="text-sm text-muted-foreground"
            >
              {refreshing
                ? 'Checking for updates before you send…'
                : 'Reconnect and check for updates before sending. You can keep editing your answers.'}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            Your coach receives this form when you send it. Unsent answers stay on this device.
          </p>
          <div className="mobile-save-bar space-y-2">
            <FormError message={form.formState.errors.root?.message} />
            {mutation.error instanceof FormAlreadySubmittedError && (
              <Button onPress={() => refresh()}>Open saved response</Button>
            )}

            <SubmitButton
              pending={form.formState.isSubmitting}
              isDisabled={pendingPhotos || !canSend}
              preventFocusOnPress
            >
              Send response
            </SubmitButton>
          </div>
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

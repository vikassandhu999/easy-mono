import {Check, Dumbbell, Pencil, Trash2} from 'lucide-react';
import {useCallback, useState} from 'react';
import {Link, useParams, useSearchParams} from 'react-router-dom';
import {useProfile} from '../api/auth';
import {ApiError, errorMessage} from '../api/client';
import {
  type PerformedSet,
  type Session,
  useSaveTraining,
  useTrainingSession,
  useWriteTrainingSet,
} from '../api/training';
import {safeReturnTo} from '../auth/return-to';
import {routes} from '../routes';
import {Button} from '../ui/button';
import {CachedRead} from '../ui/cached-read';
import {useCoaching} from '../ui/coaching';
import {Confirm} from '../ui/confirm';
import {useOnline} from '../ui/connection-status';
import {DraftStatus} from '../ui/draft-status';
import {FormError} from '../ui/form-error';
import {Page} from '../ui/page';
import {ReadState} from '../ui/read-state';
import {ReferenceNotice} from '../ui/reference-notice';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';
import {
  creationBody,
  dayLabel,
  measurementText,
  type SetEntry,
  type SetValues,
  sessionName,
  setMeasurements,
  setValues,
  targetText,
} from './recording';
import {SetEditor} from './set-editor';
import {entryHasInput, newEntry, useWorkoutDraft} from './workout-draft';
import {WorkoutNotes} from './workout-notes';

export function TrainingSession() {
  const {id = ''} = useParams();
  const [params] = useSearchParams();
  const returnTo = params.has('returnTo') ? safeReturnTo(params.get('returnTo')) : `${routes.training}?view=history`;
  const query = useTrainingSession(id);
  const profile = useProfile();
  const {canWrite} = useCoaching();
  const online = useOnline();
  const session = query.data?.data;
  return (
    <Page
      title={session ? sessionName(session) : 'Your workout'}
      description={
        session
          ? `${dayLabel(session.date)} · ${session.state === 'active' ? 'In progress' : session.state === 'completed' ? 'Workout saved' : 'Discarded'}`
          : undefined
      }
      back={returnTo}
      compact
    >
      {!session || !profile.data ? (
        <ReadState
          label="your workout"
          failed={query.isError || profile.isError}
          retry={() => {
            query.refetch();
            profile.refetch();
          }}
        />
      ) : (
        <>
          <ReferenceNotice revision={session.revision} />
          <CachedRead
            updatedAt={query.dataUpdatedAt}
            failed={query.isError}
            refreshing={query.isFetching}
            refresh={() => query.refetch()}
          />
          {canWrite && session.state === 'active' && !online && (
            <p className="text-sm text-muted-foreground">Entries stay on this device. Connect to save your workout.</p>
          )}
          {canWrite ? (
            <SessionContent
              key={session.id}
              session={session}
              returnTo={returnTo}
              unit={profile.data.data.unit_system === 'imperial' ? 'lbs' : 'kg'}
              localDate={profile.data.data.local_date}
              canSave={online && query.isFetchedAfterMount && !query.isFetching && !query.isError}
            />
          ) : (
            <SavedWorkout session={session} />
          )}
        </>
      )}
    </Page>
  );
}

type Confirmation = {kind: 'finish' | 'discard' | 'clear' | 'clearAll'} | {kind: 'remove'; id: string};

function entryIdentity(entry: SetEntry) {
  return entry.operation.kind === 'create' ? entry.operation.requestId : entry.operation.id;
}

function SessionContent({
  session,
  unit,
  localDate,
  canSave,
  returnTo,
}: {
  session: Session;
  unit: 'kg' | 'lbs';
  localDate: string;
  canSave: boolean;
  returnTo: string;
}) {
  const {draft, update, state: draftState, loadError} = useWorkoutDraft(session, unit);
  const saveSet = useWriteTrainingSet(session.id);
  const saveWorkout = useSaveTraining(session.id);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [working, setWorking] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const pending = working || saveSet.isPending || saveWorkout.isPending;
  const entry = draft?.entries.find((item) => item.key === draft.selected);
  const selected = draft?.selected ?? '';
  const exercise = session.prescription_snapshot?.workout.exercises.find((item) => item.ref === selected);
  const savedSets = session.performed_sets.filter((set) =>
    selected === 'freestyle' ? !set.snapshot_exercise_ref : set.snapshot_exercise_ref === selected,
  );
  const previousSet = savedSets.findLast(
    (set) =>
      selected !== 'freestyle' ||
      (set.exercise_name === entry?.values.exercise_name.trim() && set.exercise_id === (entry.exerciseId ?? null)),
  );

  const changeEntry = useCallback(
    (values: SetValues) => {
      if (!entry || pending) {
        return;
      }
      update((current) => ({
        ...current,
        entries: current.entries.map((item) =>
          item.key === entry.key && entryIdentity(item) === entryIdentity(entry) && !item.attempted
            ? {...item, values}
            : item,
        ),
      }));
    },
    [entry, pending, update],
  );

  const saveEntry = async (attempt: SetEntry) => {
    if (pending || !canSave) {
      return;
    }
    setWorking(true);
    setError('');
    setNotice('');
    try {
      const frozen = {
        ...attempt,
        attempted: true,
        expectedRevision:
          attempt.expectedRevision ??
          (session.state === 'completed' ? draft?.revision : session.revision) ??
          session.revision,
      };
      const persisted = await update((current) => ({
        ...current,
        entries: current.entries.map((item) => (item.key === attempt.key ? frozen : item)),
      }));
      if (!persisted) {
        throw new Error('draft');
      }
      await saveSet.mutateAsync(
        frozen.operation.kind === 'create'
          ? {kind: 'create', body: {...creationBody(frozen), expected_revision: frozen.expectedRevision}}
          : {
              kind: 'update',
              id: frozen.operation.id,
              body: {
                ...setMeasurements(frozen.values),
                ...(!frozen.exerciseId ? {exercise_name: frozen.values.exercise_name.trim()} : {}),
                expected_revision: frozen.expectedRevision,
              },
            },
      );
      const cleared = await update(
        (current) => ({
          ...current,
          revision: frozen.expectedRevision + 1,
          entries: current.entries.map((item) => {
            if (item.key !== attempt.key || entryIdentity(item) !== entryIdentity(attempt)) {
              return item;
            }
            const fresh = newEntry(item.key, session, unit);
            return item.key === 'freestyle'
              ? {
                  ...fresh,
                  values: {
                    ...fresh.values,
                    exercise_name: item.values.exercise_name,
                    tracking: item.values.tracking,
                    load_unit: item.values.load_unit,
                    distance_unit: item.values.distance_unit,
                  },
                }
              : fresh;
          }),
        }),
        true,
      );
      setNotice(cleared ? 'Set saved.' : 'Your set was saved. Retry to safely confirm it and clear the local entry.');
    } catch (cause) {
      if (cause instanceof ApiError && (cause.status === 422 || cause.status === 409)) {
        await update((current) => ({
          ...current,
          entries: current.entries.map((item) => (item.key === attempt.key ? {...item, attempted: false} : item)),
        }));
      }
      setError(errorMessage(cause, 'Your set save could not be confirmed. Your entry is kept; retry when connected.'));
    } finally {
      setWorking(false);
    }
  };

  const editSet = async (set: PerformedSet) => {
    if (entry && entryHasInput(entry)) {
      setError('Save or clear your current entry before editing another set.');
      return;
    }
    await update((current) => ({
      ...current,
      entries: current.entries.map((item) =>
        item.key === current.selected
          ? {
              key: item.key,
              exerciseId: set.exercise_id,
              values: setValues(set, exercise, unit),
              operation: {kind: 'edit', id: set.id},
              attempted: false,
              expectedRevision: session.revision,
            }
          : item,
      ),
    }));
    setError('');
    setNotice('');
  };

  const confirm = async () => {
    if (!confirmation || !draft || pending) {
      return;
    }
    setWorking(true);
    setError('');
    setNotice('');
    try {
      if (confirmation.kind === 'clear') {
        if (
          !(await update(
            (current) => ({
              ...current,
              entries: current.entries.map((item) =>
                item.key === selected ? newEntry(selected, session, unit) : item,
              ),
            }),
            true,
          ))
        ) {
          throw new Error('draft');
        }
      } else if (confirmation.kind === 'clearAll') {
        if (
          !(await update(
            (current) => ({
              ...current,
              entries: [],
              notes: session.notes ?? '',
              date: session.date,
              revision: session.revision,
              soreness: session.soreness_rating === null ? '' : String(session.soreness_rating),
            }),
            true,
          ))
        ) {
          throw new Error('draft');
        }
      } else if (confirmation.kind === 'remove') {
        await saveSet.mutateAsync({kind: 'remove', id: confirmation.id, expectedRevision: session.revision});
        await update((current) => ({...current, revision: session.revision + 1}), true);
        setNotice('Set removed.');
      } else {
        const savedWorkout = await saveWorkout.mutateAsync(
          confirmation.kind === 'discard'
            ? {kind: 'discard'}
            : {
                kind: 'complete',
                body: {
                  expected_revision: draft.revision ?? session.revision,
                  date: draft.date ?? session.date,
                  notes: draft.notes,
                  soreness_rating: draft.soreness ? Number(draft.soreness) : null,
                },
              },
        );
        await update((current) => ({...current, revision: savedWorkout.data.revision}), true);
      }
      setConfirmation(null);
    } catch (cause) {
      setError(
        errorMessage(
          cause,
          'This change could not be confirmed. Your entries are kept. Check your connection and try again.',
        ),
      );
    } finally {
      setWorking(false);
    }
  };

  if (!draft) {
    return loadError ? <FormError message={loadError} /> : <p role="status">Opening your saved draft…</p>;
  }
  const unsent = draft.entries.filter(entryHasInput);
  const unsentNotes =
    (draft.date ?? session.date) !== session.date ||
    draft.notes !== (session.notes ?? '') ||
    draft.soreness !== (session.soreness_rating === null ? '' : String(session.soreness_rating));
  return (
    <div className="space-y-6">
      <FormError message={error} />
      {notice && (
        <p
          role="status"
          className="text-primary"
        >
          {notice}
        </p>
      )}
      {session.state === 'completed' && (
        <div className="rounded-3xl bg-[var(--progress)] p-5 space-y-3">
          <p className="font-semibold">Your completed workout is saved.</p>
          <p className="text-sm">
            You can correct recorded facts and when the workout happened. Your original targets and first-shared time
            stay the same.
          </p>
          <Button
            variant="outline"
            onPress={() => setCorrecting(!correcting)}
          >
            {correcting ? 'View saved workout' : 'Correct this workout'}
          </Button>
        </div>
      )}
      {correcting && draft.revision !== session.revision && (
        <section className="rounded-3xl bg-surface p-5 space-y-3">
          <h2 className="font-semibold">Workout changed</h2>
          <p className="text-sm">
            Your draft is kept. Compare the saved sets and note before applying your corrections to the latest version.
          </p>
          <p className="text-sm whitespace-pre-wrap">
            Saved note: {session.notes || 'No note'}
            {session.soreness_rating ? ` · Soreness ${session.soreness_rating}/5` : ''}
            {` · Workout date ${session.date}`}
          </p>
          <Button
            variant="outline"
            isDisabled={pending}
            onPress={() =>
              update(
                (current) => ({
                  ...current,
                  revision: session.revision,
                  entries: current.entries.map((item) => ({
                    ...item,
                    expectedRevision: session.revision,
                    attempted: false,
                  })),
                }),
                true,
              )
            }
          >
            I’ve compared the latest workout
          </Button>
        </section>
      )}
      {session.state === 'active' || correcting ? (
        <>
          {session.prescription_snapshot && (
            <>
              <p className="text-sm text-muted-foreground">
                Targets saved when you started · {session.prescription_snapshot.plan.name}
              </p>
              <SelectField
                aria-label="Exercise"
                value={selected}
                isDisabled={pending}
                onChange={(key) => {
                  if (
                    key !== 'freestyle' &&
                    !session.prescription_snapshot?.workout.exercises.some((item) => item.ref === key)
                  ) {
                    return;
                  }
                  update((current) => ({
                    ...current,
                    selected: key,
                    entries: current.entries.some((item) => item.key === key)
                      ? current.entries
                      : [...current.entries, newEntry(key, session, unit)],
                  }));
                  setNotice('');
                  setError('');
                }}
              >
                {session.prescription_snapshot.workout.exercises.map((item, index) => (
                  <SelectItem
                    key={item.ref}
                    id={item.ref}
                  >
                    {index + 1}. {item.exercise_name}
                  </SelectItem>
                ))}
                <SelectItem id="freestyle">Add another exercise</SelectItem>
              </SelectField>
            </>
          )}
          <section className="space-y-4">
            <div className="flex items-start gap-3">
              <Dumbbell
                className="size-6 shrink-0 mt-1 text-primary"
                aria-hidden="true"
              />
              <h2 className="text-2xl font-bold leading-tight">{exercise?.exercise_name ?? 'Your exercise'}</h2>
            </div>
            {exercise && (
              <div className="rounded-3xl bg-[var(--training)] p-5 space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wide">Your targets</h3>
                {exercise.sets.length === 0 ? (
                  <p>No set targets prescribed.</p>
                ) : (
                  <ol className="space-y-2">
                    {exercise.sets.map((set, index) => (
                      <li key={index}>
                        <p>
                          Set {index + 1} · {targetText(set)}
                        </p>
                        {set.notes && <p className="text-sm text-muted-foreground">{set.notes}</p>}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}
            {entry && (
              <SetEditor
                key={entryIdentity(entry)}
                entry={entry}
                pending={pending}
                canSave={canSave}
                previous={
                  previousSet && !entryHasInput(entry)
                    ? {...setValues(previousSet, exercise, unit), tracking: entry.values.tracking, rpe: '', notes: ''}
                    : undefined
                }
                onChange={changeEntry}
                onSave={(values) => {
                  saveEntry({...entry, values});
                }}
                onClear={() => setConfirmation({kind: 'clear'})}
              />
            )}
            {savedSets.length > 0 && (
              <ol
                aria-label="Saved sets"
                className="divide-y divide-border"
              >
                {savedSets.map((set) => (
                  <li
                    key={set.id}
                    className="py-3 flex items-start gap-2"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="font-medium">
                        {selected === 'freestyle' ? `${set.exercise_name} · ` : ''}
                        {measurementText(set)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {set.set_type === 'warmup'
                          ? 'Warm-up'
                          : set.set_type === 'dropset'
                            ? 'Drop set'
                            : 'Working set'}
                        {set.rpe ? ` · Effort ${set.rpe}/10` : ''}
                      </p>
                      {set.notes && <p className="text-sm whitespace-pre-wrap">{set.notes}</p>}
                    </div>
                    <div className="flex shrink-0">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        isDisabled={pending || !canSave}
                        onPress={() => {
                          editSet(set);
                        }}
                      >
                        <Pencil
                          className="size-4"
                          aria-hidden="true"
                        />
                        <span className="sr-only">Edit set</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        isDisabled={pending || !canSave}
                        onPress={() => setConfirmation({kind: 'remove', id: set.id})}
                      >
                        <Trash2
                          className="size-4"
                          aria-hidden="true"
                        />
                        <span className="sr-only">Remove set</span>
                      </Button>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
          <DraftStatus state={draftState} />
          <WorkoutNotes
            notes={draft.notes}
            soreness={draft.soreness}
            date={draft.date ?? session.date}
            localDate={localDate}
            pending={pending}
            canSave={canSave}
            onChange={(values) => {
              update((current) => ({...current, ...values}));
            }}
            onSave={async (values) => {
              setError('');
              if (!(await update((current) => ({...current, ...values}), true))) {
                throw new Error('Your workout details could not be saved on this device. Try again before sharing.');
              }
              const savedWorkout = await saveWorkout.mutateAsync({
                kind: 'save',
                body: {
                  expected_revision: draft.revision ?? session.revision,
                  date: values.date,
                  notes: values.notes,
                  soreness_rating: values.soreness ? Number(values.soreness) : null,
                },
              });
              await update((current) => ({...current, revision: savedWorkout.data.revision}), true);
              setNotice(
                session.state === 'completed'
                  ? 'Corrections shared.'
                  : 'Workout details saved. Your note will be sent when you finish.',
              );
            }}
            onFinish={session.state === 'active' ? () => setConfirmation({kind: 'finish'}) : undefined}
            completed={session.state === 'completed'}
          />
          {session.state === 'active' && (
            <Button
              variant="ghost"
              isDisabled={pending || !canSave}
              onPress={() => setConfirmation({kind: 'discard'})}
            >
              Discard workout
            </Button>
          )}
        </>
      ) : (
        <>
          <p
            role="status"
            className="flex gap-3 items-center rounded-3xl bg-[var(--progress)] p-5 text-xl font-bold"
          >
            <Check
              className="size-6 shrink-0"
              aria-hidden="true"
            />
            {session.state === 'completed' ? 'Your workout is saved.' : 'This workout was discarded.'}
          </p>
          <SavedWorkout session={session} />
          {(unsent.length > 0 || unsentNotes) && (
            <section className="border-t border-border pt-5 space-y-3">
              <h2 className="text-xl font-semibold">Unsent entries on this device</h2>
              <p className="text-muted-foreground">
                These local entries are kept separately from the saved result. Use Correct this workout to add or edit
                them.
              </p>
              {unsent.map((item) => (
                <div
                  key={item.key}
                  className="space-y-2"
                >
                  <p className="font-medium">{item.values.exercise_name}</p>
                  <p>
                    {measurementText({
                      ...setMeasurements(item.values),
                      load_value: item.values.load_value || null,
                      distance_value: item.values.distance_value || null,
                    })}
                  </p>
                  <p>{item.values.notes}</p>
                  {item.attempted && item.operation.kind === 'create' && (
                    <Button
                      variant="outline"
                      isDisabled={!canSave || pending}
                      onPress={() => {
                        saveEntry(item);
                      }}
                    >
                      Check pending set save
                    </Button>
                  )}
                </div>
              ))}
              {unsentNotes && (
                <p className="whitespace-pre-wrap">
                  {draft.notes}
                  {draft.soreness ? ` · Soreness ${draft.soreness}/5` : ''}
                  {` · Workout date ${draft.date ?? session.date}`}
                </p>
              )}
              <Button
                variant="ghost"
                isDisabled={pending}
                onPress={() => setConfirmation({kind: 'clearAll'})}
              >
                Remove local entries
              </Button>
            </section>
          )}
          <Link
            className="flex min-h-12 items-center justify-center rounded-2xl bg-surface px-4 font-semibold"
            to={returnTo}
          >
            Back to workout history
          </Link>
          <Link
            className="flex min-h-12 items-center justify-center rounded-2xl bg-surface px-4 font-semibold"
            to={routes.home}
          >
            Back to Today
          </Link>
        </>
      )}
      {confirmation && (
        <Confirm
          title={
            confirmation.kind === 'finish'
              ? 'Finish this workout?'
              : confirmation.kind === 'discard'
                ? 'Discard this workout?'
                : confirmation.kind === 'remove'
                  ? 'Remove this saved set?'
                  : 'Clear the local entry?'
          }
          action={
            confirmation.kind === 'finish'
              ? 'Finish and save workout'
              : confirmation.kind === 'discard'
                ? 'Confirm discard'
                : confirmation.kind === 'remove'
                  ? 'Remove saved set'
                  : 'Clear local entry'
          }
          pending={pending}
          onClose={() => setConfirmation(null)}
          onConfirm={() => {
            confirm();
          }}
        >
          <p>
            {confirmation.kind === 'finish'
              ? `Your recorded sets and workout notes will be saved. ${unsent.length ? 'Unsent set entries will remain on this device and will not be added to the workout.' : 'You can review the result in your history.'}`
              : confirmation.kind === 'discard'
                ? 'This closes the workout as discarded. Recorded sets remain in its history, and unsent entries stay on this device.'
                : confirmation.kind === 'remove'
                  ? 'This removes the set from the saved workout. Your coach’s prescribed targets remain unchanged.'
                  : 'This removes the local draft. It does not remove a set that was already saved on the server.'}
          </p>
          <FormError message={error} />
        </Confirm>
      )}
    </div>
  );
}

function SavedWorkout({session}: {session: Session}) {
  return (
    <div className="space-y-5">
      {session.performed_sets.length === 0 ? (
        <p className="text-muted-foreground">No sets were recorded.</p>
      ) : (
        <ol
          aria-label="Saved sets"
          className="divide-y divide-border"
        >
          {session.performed_sets.map((set) => (
            <li
              key={set.id}
              className="py-4 space-y-1"
            >
              <h2 className="font-semibold">{set.exercise_name}</h2>
              <p>{measurementText(set)}</p>
              {set.rpe && <p className="text-sm">Effort {set.rpe}/10</p>}
              {set.notes && <p className="whitespace-pre-wrap text-muted-foreground">{set.notes}</p>}
            </li>
          ))}
        </ol>
      )}
      {session.notes && (
        <section>
          <h2 className="font-semibold">Note to coach</h2>
          <p className="whitespace-pre-wrap">{session.notes}</p>
        </section>
      )}
      {session.soreness_rating && <p>Soreness: {session.soreness_rating}/5</p>}
    </div>
  );
}

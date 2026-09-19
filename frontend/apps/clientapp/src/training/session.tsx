import {useCallback, useState} from 'react';
import {Link, useParams} from 'react-router-dom';
import {useProfile} from '../api/auth';
import {ApiError, errorMessage} from '../api/client';
import {
  type PerformedSet,
  type Session,
  useSaveTraining,
  useTrainingSession,
  useWriteTrainingSet,
} from '../api/training';
import {routes} from '../routes';
import {Button} from '../ui/button';
import {CachedRead} from '../ui/cached-read';
import {Confirm} from '../ui/confirm';
import {useOnline} from '../ui/connection-status';
import {DraftStatus} from '../ui/draft-status';
import {FormError} from '../ui/form-error';
import {Page} from '../ui/page';
import {ReadState} from '../ui/read-state';
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
  const query = useTrainingSession(id);
  const profile = useProfile();
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
      back={`${routes.training}?view=history`}
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
          <CachedRead
            updatedAt={query.dataUpdatedAt}
            failed={query.isError}
            refreshing={query.isFetching}
            refresh={() => query.refetch()}
          />
          {session.state === 'active' && !online && (
            <p className="text-sm text-muted-foreground">Entries stay on this device. Connect to save your workout.</p>
          )}
          <SessionContent
            key={session.id}
            session={session}
            unit={profile.data.data.default_weight_unit}
            canSave={online && query.isFetchedAfterMount && !query.isFetching && !query.isError}
          />
        </>
      )}
    </Page>
  );
}

type Confirmation = {kind: 'finish' | 'discard' | 'clear' | 'clearAll'} | {kind: 'remove'; id: string};

function entryIdentity(entry: SetEntry) {
  return entry.operation.kind === 'create' ? entry.operation.requestId : entry.operation.id;
}

function SessionContent({session, unit, canSave}: {session: Session; unit: 'kg' | 'lbs'; canSave: boolean}) {
  const {draft, update, state: draftState, loadError} = useWorkoutDraft(session, unit);
  const saveSet = useWriteTrainingSet(session.id);
  const saveWorkout = useSaveTraining(session.id);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [working, setWorking] = useState(false);
  const pending = working || saveSet.isPending || saveWorkout.isPending;
  const entry = draft?.entries.find((item) => item.key === draft.selected);
  const selected = draft?.selected ?? '';
  const exercise = session.prescription_snapshot?.workout.exercises.find((item) => item.ref === selected);
  const savedSets = session.performed_sets.filter((set) =>
    selected === 'freestyle' ? !set.snapshot_exercise_ref : set.snapshot_exercise_ref === selected,
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
      const frozen = {...attempt, attempted: true};
      const persisted = await update((current) => ({
        ...current,
        entries: current.entries.map((item) => (item.key === attempt.key ? frozen : item)),
      }));
      if (!persisted) {
        throw new Error('draft');
      }
      await saveSet.mutateAsync(
        frozen.operation.kind === 'create'
          ? {kind: 'create', body: creationBody(frozen)}
          : {kind: 'update', id: frozen.operation.id, body: setMeasurements(frozen.values)},
      );
      const cleared = await update(
        (current) => ({
          ...current,
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
      if (cause instanceof ApiError && cause.status === 422) {
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
              soreness: session.soreness_rating === null ? '' : String(session.soreness_rating),
            }),
            true,
          ))
        ) {
          throw new Error('draft');
        }
      } else if (confirmation.kind === 'remove') {
        await saveSet.mutateAsync({kind: 'remove', id: confirmation.id});
        setNotice('Set removed.');
      } else {
        await saveWorkout.mutateAsync(
          confirmation.kind === 'discard'
            ? {kind: 'discard'}
            : {
                kind: 'complete',
                body: {notes: draft.notes, ...(draft.soreness ? {soreness_rating: Number(draft.soreness)} : {})},
              },
        );
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
      {session.state === 'active' ? (
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
            <h2 className="text-2xl font-semibold">{exercise?.exercise_name ?? 'Your exercise'}</h2>
            {exercise && (
              <div className="rounded-xl bg-muted p-4 space-y-2">
                <h3 className="font-semibold">Your targets</h3>
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
            {savedSets.length > 0 && (
              <ol
                aria-label="Saved sets"
                className="divide-y divide-border"
              >
                {savedSets.map((set) => (
                  <li
                    key={set.id}
                    className="py-3 space-y-1"
                  >
                    <p className="font-medium">
                      {selected === 'freestyle' ? `${set.exercise_name} · ` : ''}
                      {measurementText(set)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {set.set_type === 'warmup' ? 'Warm-up' : set.set_type === 'dropset' ? 'Drop set' : 'Working set'}
                      {set.rpe ? ` · Effort ${set.rpe}/10` : ''}
                    </p>
                    {set.notes && <p className="text-sm whitespace-pre-wrap">{set.notes}</p>}
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        isDisabled={pending || !canSave}
                        onPress={() => {
                          editSet(set);
                        }}
                      >
                        Edit set
                      </Button>
                      <Button
                        variant="ghost"
                        isDisabled={pending || !canSave}
                        onPress={() => setConfirmation({kind: 'remove', id: set.id})}
                      >
                        Remove set
                      </Button>
                    </div>
                  </li>
                ))}
              </ol>
            )}
            {entry && (
              <SetEditor
                key={entryIdentity(entry)}
                entry={entry}
                pending={pending}
                canSave={canSave}
                onChange={changeEntry}
                onSave={(values) => {
                  saveEntry({...entry, values});
                }}
                onClear={() => setConfirmation({kind: 'clear'})}
              />
            )}
          </section>
          <DraftStatus state={draftState} />
          <WorkoutNotes
            notes={draft.notes}
            soreness={draft.soreness}
            savedSoreness={session.soreness_rating}
            pending={pending}
            canSave={canSave}
            onChange={(values) => {
              update((current) => ({...current, ...values}));
            }}
            onSave={async (values) => {
              setError('');
              try {
                await saveWorkout.mutateAsync({
                  kind: 'save',
                  body: {notes: values.notes, ...(values.soreness ? {soreness_rating: Number(values.soreness)} : {})},
                });
                setNotice('Workout notes saved.');
              } catch (cause) {
                setError(errorMessage(cause, 'Your notes could not be saved. They are kept on this device.'));
              }
            }}
            onFinish={() => setConfirmation({kind: 'finish'})}
          />
          <Button
            variant="ghost"
            isDisabled={pending || !canSave}
            onPress={() => setConfirmation({kind: 'discard'})}
          >
            Discard workout
          </Button>
        </>
      ) : (
        <>
          <p
            role="status"
            className="text-lg font-medium"
          >
            {session.state === 'completed' ? 'Your workout is saved.' : 'This workout was discarded.'}
          </p>
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
              <h2 className="font-semibold">Workout notes</h2>
              <p className="whitespace-pre-wrap">{session.notes}</p>
            </section>
          )}
          {session.soreness_rating && <p>Soreness: {session.soreness_rating}/5</p>}
          {(unsent.length > 0 || unsentNotes) && (
            <section className="border-t border-border pt-5 space-y-3">
              <h2 className="text-xl font-semibold">Unsent entries on this device</h2>
              <p className="text-muted-foreground">
                This workout is closed. These local entries are kept separately from the saved result.
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
            className="text-link block"
            to={`${routes.training}?view=history`}
          >
            Back to workout history
          </Link>
          <Link
            className="text-link block"
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
                  ? 'This removes the set from your active workout.'
                  : 'This removes the local draft. It does not remove a set that was already saved on the server.'}
          </p>
          <FormError message={error} />
        </Confirm>
      )}
    </div>
  );
}

import {AlertCircle, ArrowLeft, Check, CloudOff, LoaderCircle} from 'lucide-react';
import {useCallback, useEffect, useRef, useState} from 'react';
import {Link, useLocation, useNavigate, useParams} from 'react-router-dom';
import {errorMessage} from '../api/client';
import {getSession} from '../api/session';
import {useUndoWorkoutWeek} from '../api/workout-week';
import {type Workout as SavedWorkout, useSaveWorkout, useWorkout} from '../api/workouts';
import {Button} from '../ui/button';
import {Dialog, DialogHeader, DialogTitle} from '../ui/dialog';
import {FormError} from '../ui/form-error';
import {Input} from '../ui/input';
import {Page} from '../ui/page';
import {Textarea} from '../ui/textarea';
import {type Undo, UndoToast} from '../ui/week-editor';
import {CardsBuilder} from './cards-builder';
import {draftOf, restoreRemoval, typeLabels, type Workout, type WorkoutType} from './model';
import {Segmented} from './parts';
import {readDraft, readDraftKeys, WorkoutSaveQueue} from './save-queue';
import {VideoPanel} from './video-panel';
import './workout-builder.css';

export function WorkoutBuilder() {
  const {id, workoutId} = useParams();
  const location = useLocation();
  const clientId = location.pathname.startsWith('/clients/') ? id : undefined;
  const currentId = location.pathname.endsWith('/new') ? 'new' : (workoutId ?? id ?? '');
  const query = useWorkout(currentId === 'new' ? '' : currentId, clientId);
  const [undoError, setUndoError] = useState<string>();
  const [undo, setUndo] = useState<Undo<{token: string; previousId: string}> | null>(null);
  const expireUndo = useCallback(() => setUndo(null), []);
  const editorAliases = useRef(new Map<string, string>());
  const [restoreVersion, setRestoreVersion] = useState(0);
  const [localUndoActive, setLocalUndoActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const restore = useUndoWorkoutWeek(clientId ?? '');
  const navigate = useNavigate();
  if (currentId === 'new') {
    return <CreateWorkout {...(clientId ? {clientId} : {})} />;
  }
  if (!query.data) {
    return (
      <Page className="editor-page">
        <h1 className="page-title">Workout</h1>
        {query.isError ? (
          <>
            <FormError message={errorMessage(query.error, 'Could not load this workout.')} />
            <Button
              onPress={() => {
                query.refetch();
              }}
            >
              Try again
            </Button>
          </>
        ) : (
          <p role="status">Loading workout…</p>
        )}
      </Page>
    );
  }
  return (
    <>
      <Editor
        key={`${clientId ?? 'library'}:${editorAliases.current.get(currentId) ?? currentId}:${restoreVersion}`}
        initial={query.data.data}
        onSaved={(token, previousId, nextId) => {
          editorAliases.current.set(nextId, editorAliases.current.get(previousId) ?? previousId);
          setUndo(token ? {message: 'Workout updated.', before: {token, previousId}} : null);
        }}
        onUndoActive={setLocalUndoActive}
        onSaving={setSaving}
        {...(clientId ? {clientId} : {})}
      />
      <UndoToast
        undo={clientId && !localUndoActive ? undo : null}
        onExpire={expireUndo}
        pending={restore.isPending || saving}
        {...(undoError ? {error: undoError} : {})}
        onUndo={async (before) => {
          try {
            await restore.mutateAsync(before.token);
            setUndo(null);
            setUndoError(undefined);
            editorAliases.current.clear();
            setRestoreVersion((version) => version + 1);
            navigate(`/clients/${clientId}/training/workouts/${before.previousId}`, {replace: true});
          } catch (cause) {
            setUndoError(errorMessage(cause, 'Could not undo this workout change.'));
          }
        }}
      />
    </>
  );
}
function Editor({
  initial,
  clientId,
  onSaved,
  onUndoActive,
  onSaving,
}: {
  initial: SavedWorkout;
  clientId?: string;
  onSaved: (token: string | null, previousId: string, nextId: string) => void;
  onUndoActive: (active: boolean) => void;
  onSaving: (saving: boolean) => void;
}) {
  const navigate = useNavigate();
  const save = useSaveWorkout(clientId);
  const sessionId = useRef(getSession()?.id).current;
  const storageKey = `easy.workout-draft.v1:${sessionId}:${clientId ?? 'library'}:${initial.id}`;
  const draftKeys = useRef(new Set([storageKey]));
  const mounted = useRef(true);
  const [, render] = useState(0);
  const [storageError, setStorageError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cardsUndoActive, setCardsUndoActive] = useState(false);
  const [typeUndo, setTypeUndo] = useState<Undo<Workout> | null>(null);
  const [pendingType, setPendingType] = useState<WorkoutType | null>(null);
  const [pendingRestore, setPendingRestore] = useState<Workout | null>(null);
  const expireTypeUndo = useCallback(() => setTypeUndo(null), []);
  const cardsUndoChanged = useCallback((active: boolean) => {
    setCardsUndoActive(active);
    if (active) {
      setTypeUndo(null);
    }
  }, []);
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;
  const saveRef = useRef(save.mutateAsync);
  saveRef.current = save.mutateAsync;
  const onSavingRef = useRef(onSaving);
  onSavingRef.current = onSaving;
  const [queue] = useState<WorkoutSaveQueue>(() => {
    let recovered = null;
    try {
      const raw = localStorage.getItem(storageKey);
      recovered = readDraft(raw);
      for (const key of readDraftKeys(raw, `easy.workout-draft.v1:${sessionId}:${clientId ?? 'library'}:`)) {
        draftKeys.current.add(key);
      }
    } catch {
      /* Storage is unavailable; keep editing in memory. */
    }
    return new WorkoutSaveQueue(
      recovered ?? draftOf(initial),
      async (id, body) => {
        if (!sessionId || getSession()?.id !== sessionId) {
          throw new Error('Your session changed. Sign in to save these changes.');
        }
        const result = await saveRef.current({id, body});
        if (getSession()?.id !== sessionId) {
          throw new Error('Your session changed.');
        }
        if (mounted.current) {
          onSavedRef.current('undo_token' in result ? result.undo_token : null, id, result.data.id);
        }
        return result.data;
      },
      () => {
        if (mounted.current) {
          render((revision) => revision + 1);
        }
      },
      (draft) => {
        try {
          if (draft) {
            draftKeys.current.add(`easy.workout-draft.v1:${sessionId}:${clientId ?? 'library'}:${draft.id}`);
            for (const key of draftKeys.current) {
              localStorage.setItem(key, JSON.stringify({...draft, storageKeys: [...draftKeys.current]}));
            }
          } else {
            for (const key of draftKeys.current) {
              localStorage.removeItem(key);
            }
          }
        } catch {
          if (mounted.current) {
            setStorageError(true);
          }
        }
      },
      Boolean(recovered),
    );
  });
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      queue.dispose();
    };
  }, [queue]);
  useEffect(() => {
    onSavingRef.current(queue.state !== 'saved' || uploading);
  }, [queue, queue.state, uploading]);
  useEffect(() => {
    onUndoActive(Boolean(typeUndo) || cardsUndoActive);
    return () => onUndoActive(false);
  }, [typeUndo, cardsUndoActive, onUndoActive]);
  useEffect(() => {
    if (queue.state === 'saved' && queue.draft.id !== initial.id) {
      navigate(clientId ? `/clients/${clientId}/training/workouts/${queue.draft.id}` : `/workouts/${queue.draft.id}`, {
        replace: true,
      });
    }
  }, [queue.state, queue.draft.id, initial.id, clientId, navigate]);
  useEffect(() => {
    const leave = (event: BeforeUnloadEvent) => {
      if (queue.state !== 'saved') {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', leave);
    return () => window.removeEventListener('beforeunload', leave);
  }, [queue]);
  const workout = queue.draft;
  useEffect(() => {
    const previous = document.title;
    document.title = `${workout.name.trim() || 'Workout'} · Workout editor · CoachEasy`;
    return () => {
      document.title = previous;
    };
  }, [workout.name]);
  const changeType = (type: WorkoutType) => {
    if (type === workout.type) {
      return;
    }
    if (workout.groups.length || workout.video) {
      setTypeUndo({message: `Changed to ${typeLabels[type].toLowerCase()}.`, before: workout});
    }
    queue.change({
      ...workout,
      type,
      groups: type === 'prescribed' ? workout.groups : [],
      video: type === 'video' ? workout.video : '',
    });
    setPendingType(null);
  };
  const nameInvalid = queue.state === 'invalid' && !workout.name.trim();
  const restoreType = (before: Workout) => {
    const restored = {
      ...queue.draft,
      type: before.type,
      video: before.type === 'video' ? before.video : '',
      groups: before.type === 'prescribed' ? queue.draft.groups : [],
    };
    queue.change(before.type === 'prescribed' ? restoreRemoval(restored, before) : restored);
    setTypeUndo(null);
    setPendingRestore(null);
  };
  const nextType = pendingType ?? pendingRestore?.type;
  const back = clientId ? `/clients/${clientId}/training` : '/workouts';
  return (
    <Page className="editor-page workout-editor min-w-0 grid-cols-1 max-w-5xl gap-5 pb-24 sm:gap-6">
      <h1 className="sr-only">Edit workout</h1>
      <div className="sticky top-[var(--app-header-height)] z-30 -mx-4 flex flex-wrap items-center justify-between gap-2 border-b border-border bg-background px-4 py-2 sm:mx-0 sm:px-0">
        <Link
          to={back}
          className="flex min-h-11 items-center gap-2 font-medium text-muted-foreground"
        >
          <ArrowLeft
            size={18}
            aria-hidden="true"
          />
          {clientId ? 'Training week' : 'Workout library'}
        </Link>
        <div
          role="status"
          className="flex min-w-0 flex-wrap items-center gap-2 text-sm font-medium"
        >
          {uploading ? (
            <>
              <LoaderCircle
                size={16}
                className="animate-spin"
                aria-hidden="true"
              />
              Uploading video…
            </>
          ) : queue.state === 'saved' ? (
            <>
              <Check
                size={16}
                aria-hidden="true"
              />
              All changes saved
            </>
          ) : queue.state === 'saving' ? (
            <>
              <LoaderCircle
                size={16}
                className="animate-spin"
                aria-hidden="true"
              />
              {save.isPaused ? 'Waiting for a connection… Your changes stay on this device.' : 'Saving…'}
            </>
          ) : queue.state === 'invalid' ? (
            <>
              <AlertCircle
                size={16}
                aria-hidden="true"
              />
              <span>Check the highlighted fields.</span>
            </>
          ) : (
            <>
              <CloudOff
                size={16}
                aria-hidden="true"
              />
              <span>Not saved. Your changes stay on this device.</span>
              <Button
                variant="outline"
                size="sm"
                onPress={() => {
                  queue.flush();
                }}
              >
                Retry
              </Button>
            </>
          )}
        </div>
      </div>
      <div className="min-w-0 space-y-4">
        <p className="text-sm font-medium text-muted-foreground">
          {clientId ? 'Client workout · Changes apply from today. Earlier weeks stay as they were.' : 'Library workout'}
        </p>
        <label
          htmlFor="workout-name"
          className="grid gap-1"
        >
          <span className="text-sm font-medium">Workout name</span>
          <Input
            id="workout-name"
            className="editor-name"
            value={workout.name}
            required
            aria-invalid={nameInvalid}
            aria-describedby={nameInvalid ? 'workout-name-error' : undefined}
            maxLength={255}
            onChange={(event) => queue.change({...workout, name: event.target.value})}
          />
        </label>
        {nameInvalid && (
          <p
            id="workout-name-error"
            role="alert"
            className="text-sm text-destructive"
          >
            Enter a workout name.
          </p>
        )}
        <label
          htmlFor="workout-description"
          className="grid gap-1"
        >
          <span className="text-sm font-medium">Instructions for the client (optional)</span>
          <Textarea
            id="workout-description"
            rows={1}
            className="min-h-12"
            value={workout.description}
            onChange={(event) => queue.change({...workout, description: event.target.value})}
          />
        </label>
        <div className="grid gap-2">
          <span className="font-semibold">What the client does</span>
          <Segmented
            label="Workout type"
            value={workout.type}
            onChange={(type) => {
              if (type === workout.type) {
                return;
              }
              if (workout.groups.length || workout.video) {
                setPendingType(type);
              } else {
                changeType(type);
              }
            }}
            options={(['prescribed', 'video', 'open'] as const).map((value) => ({value, label: typeLabels[value]}))}
          />
        </div>
      </div>
      {queue.state === 'failed' && <FormError message={queue.error} />}
      {storageError && (
        <FormError message="Device storage is unavailable. Keep this page open until all changes are saved." />
      )}
      {workout.type === 'prescribed' ? (
        <CardsBuilder
          workout={workout}
          setWorkout={(draft) => queue.change(draft)}
          onUndoActive={cardsUndoChanged}
          validationVisible={queue.state === 'invalid'}
        />
      ) : workout.type === 'video' ? (
        <VideoPanel
          value={workout.video}
          onChange={(video) => {
            if (queue.draft.type === 'video') {
              queue.change({...queue.draft, video});
            }
          }}
          validationVisible={queue.state === 'invalid'}
          onPendingChange={setUploading}
        />
      ) : (
        <section className="surface space-y-2">
          <h2 className="editor-section-title">Open session</h2>
          <p className="text-muted-foreground">
            The leader decides what to do during the session. Set the time, place and coach in the training week.
          </p>
        </section>
      )}
      <UndoToast
        undo={cardsUndoActive ? null : typeUndo}
        onExpire={expireTypeUndo}
        onUndo={(before) => {
          if (before.type !== workout.type && (workout.groups.length || workout.video)) {
            setPendingRestore(before);
          } else {
            restoreType(before);
          }
        }}
      />
      {nextType && (
        <Dialog
          className="workout-editor"
          isOpen
          onOpenChange={(open) => {
            if (!open) {
              setPendingType(null);
              setPendingRestore(null);
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Switch to {typeLabels[nextType].toLowerCase()}?</DialogTitle>
          </DialogHeader>
          <div className="dialog-body space-y-4">
            <p>
              This removes{' '}
              {workout.type === 'prescribed' ? 'the current exercises and their targets' : 'the current video'} from
              this workout.{' '}
              {pendingRestore ? 'The previous workout content will be restored.' : 'You can Undo this change.'}
            </p>
            <div className="flex flex-wrap justify-end gap-3">
              <Button
                variant="outline"
                onPress={() => {
                  setPendingType(null);
                  setPendingRestore(null);
                }}
              >
                Keep current type
              </Button>
              <Button
                onPress={() => {
                  if (pendingRestore) {
                    restoreType(pendingRestore);
                  } else {
                    changeType(nextType);
                  }
                }}
              >
                Switch workout type
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </Page>
  );
}
function CreateWorkout({clientId}: {clientId?: string}) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string>();
  const [nameInvalid, setNameInvalid] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const save = useSaveWorkout(clientId);
  const navigate = useNavigate();
  return (
    <Page className="editor-page">
      <h1 className="page-title">Create workout</h1>
      <form
        className="space-y-4"
        noValidate
        onSubmit={async (event) => {
          event.preventDefault();
          if (save.isPending) {
            return;
          }
          if (!name.trim()) {
            setNameInvalid(true);
            input.current?.focus();
            return;
          }
          setError(undefined);
          setNameInvalid(false);
          try {
            const result = await save.mutateAsync({
              body: {name: name.trim(), description: null, type: 'prescribed', video_url: null, groups: []},
            });
            navigate(
              clientId ? `/clients/${clientId}/training/workouts/${result.data.id}` : `/workouts/${result.data.id}`,
              {replace: true},
            );
          } catch (cause) {
            setError(errorMessage(cause, 'Could not create this workout.'));
          }
        }}
      >
        <label
          htmlFor="new-workout-name"
          className="grid gap-1"
        >
          <span className="text-sm font-medium">Workout name</span>
          <Input
            id="new-workout-name"
            ref={input}
            autoFocus
            required
            aria-invalid={nameInvalid}
            aria-describedby={nameInvalid ? 'new-workout-name-error' : undefined}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (event.target.value.trim()) {
                setNameInvalid(false);
              }
              setError(undefined);
            }}
          />
        </label>
        {nameInvalid && (
          <p
            id="new-workout-name-error"
            role="alert"
            className="text-sm text-destructive"
          >
            Enter a workout name.
          </p>
        )}
        <FormError message={error} />
        <Button
          type="submit"
          isPending={save.isPending}
        >
          Create workout
        </Button>
      </form>
    </Page>
  );
}

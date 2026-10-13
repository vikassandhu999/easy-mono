import {ArrowLeft, Check, CloudOff, LoaderCircle} from 'lucide-react';
import {useEffect, useRef, useState} from 'react';
import {Link, useLocation, useNavigate, useParams} from 'react-router-dom';
import {errorMessage} from '../api/client';
import {useUploadLibraryMedia} from '../api/library-media';
import {getSession} from '../api/session';
import {useUndoWorkoutWeek} from '../api/workout-week';
import {type Workout as SavedWorkout, useSaveWorkout, useWorkout} from '../api/workouts';
import {Button} from '../ui/button';
import {FormError} from '../ui/form-error';
import {Input} from '../ui/input';
import {Page} from '../ui/page';
import {Textarea} from '../ui/textarea';
import {CardsBuilder} from './cards-builder';
import {draftOf, typeLabels, validUrl} from './model';
import {Segmented} from './parts';
import {readDraft, readDraftKeys, WorkoutSaveQueue} from './save-queue';
import './workout-builder.css';

export function WorkoutBuilder() {
  const {id, workoutId} = useParams();
  const location = useLocation();
  const clientId = location.pathname.startsWith('/clients/') ? id : undefined;
  const currentId = location.pathname.endsWith('/new') ? 'new' : (workoutId ?? id ?? '');
  const query = useWorkout(currentId === 'new' ? '' : currentId, clientId);
  const [undoError, setUndoError] = useState<string>();
  const [undo, setUndo] = useState<{token: string; previousId: string; expires: number} | null>(null);
  const editorAliases = useRef(new Map<string, string>());
  const [restoreVersion, setRestoreVersion] = useState(0);
  const [localUndoActive, setLocalUndoActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const restore = useUndoWorkoutWeek(clientId ?? '');
  const navigate = useNavigate();
  useEffect(() => {
    if (!undo) {
      return;
    }
    const timer = window.setTimeout(() => setUndo(null), Math.max(0, undo.expires - Date.now()));
    return () => window.clearTimeout(timer);
  }, [undo]);
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
          setUndo(token ? {token, previousId, expires: Date.now() + 8000} : null);
        }}
        onUndoActive={setLocalUndoActive}
        onSaving={setSaving}
        {...(clientId ? {clientId} : {})}
      />
      {undoError && <FormError message={undoError} />}
      {undo && clientId && !localUndoActive && (
        <div
          role="status"
          className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4"
        >
          <div className="flex items-center gap-3 rounded-xl bg-foreground py-2 pr-2 pl-4 text-background shadow-lg">
            <span>Workout updated.</span>
            <Button
              variant="outline"
              isPending={restore.isPending}
              isDisabled={saving}
              onPress={async () => {
                try {
                  await restore.mutateAsync(undo.token);
                  setUndo(null);
                  setUndoError(undefined);
                  editorAliases.current.clear();
                  setRestoreVersion((version) => version + 1);
                  navigate(`/clients/${clientId}/training/workouts/${undo.previousId}`, {replace: true});
                } catch (cause) {
                  setUndoError(errorMessage(cause, 'Could not undo this workout change.'));
                }
              }}
            >
              Undo
            </Button>
          </div>
        </div>
      )}
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
          onSavingRef.current(queue.state !== 'saved');
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
    onSavingRef.current(queue.state !== 'saved');
    return () => {
      mounted.current = false;
      queue.dispose();
    };
  }, [queue]);
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
  const back = clientId ? `/clients/${clientId}/training` : '/workouts';
  return (
    <Page className="editor-page min-w-0 grid-cols-1 max-w-5xl pb-24">
      <div className="sticky top-0 z-30 -mx-4 flex flex-wrap items-center justify-between gap-2 border-b border-border bg-background px-4 py-2 sm:mx-0 sm:px-0">
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
          className="flex flex-wrap items-center gap-2 text-sm font-medium"
        >
          {queue.state === 'saved' ? (
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
              Saving…
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
            aria-invalid={!workout.name.trim()}
            maxLength={255}
            onChange={(event) => queue.change({...workout, name: event.target.value})}
          />
        </label>
        <label
          htmlFor="workout-description"
          className="grid gap-1"
        >
          <span className="text-sm font-medium">Instructions for the client (optional)</span>
          <Textarea
            id="workout-description"
            rows={2}
            value={workout.description}
            onChange={(event) => queue.change({...workout, description: event.target.value})}
          />
        </label>
        <div className="grid gap-2">
          <span className="font-semibold">What the client does</span>
          <Segmented
            label="Workout type"
            value={workout.type}
            onChange={(type) => queue.change({...workout, type})}
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
          onUndoActive={onUndoActive}
        />
      ) : workout.type === 'video' ? (
        <VideoPanel
          value={workout.video}
          onChange={(video) => queue.change({...workout, video})}
        />
      ) : (
        <section className="surface space-y-2">
          <h2 className="editor-section-title">Open session</h2>
          <p className="text-muted-foreground">
            The leader decides what to do during the session. Set the time, place and coach in the training week.
          </p>
        </section>
      )}
    </Page>
  );
}
function VideoPanel({value, onChange}: {value: string; onChange: (value: string) => void}) {
  const upload = useUploadLibraryMedia();
  const fileInput = useRef<HTMLInputElement>(null);
  const active = useRef<AbortController | null>(null);
  const [error, setError] = useState<string>();
  useEffect(() => () => active.current?.abort(), []);
  return (
    <section className="surface space-y-3">
      <h2 className="editor-section-title">Video</h2>
      <p className="text-muted-foreground">The client follows this video on the scheduled day.</p>
      <label
        htmlFor="workout-video"
        className="grid gap-1"
      >
        <span className="text-sm font-medium">Video URL</span>
        <Input
          id="workout-video"
          type="url"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="https://…"
        />
      </label>
      <input
        ref={fileInput}
        type="file"
        className="sr-only"
        aria-label="Choose workout video"
        tabIndex={-1}
        accept="video/mp4,video/webm"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (!file) {
            return;
          }
          active.current = new AbortController();
          setError(undefined);
          try {
            const media = await upload.mutateAsync({file, signal: active.current.signal});
            if (!media.url) {
              throw new Error('The uploaded video has no public URL.');
            }
            onChange(media.url);
          } catch (cause) {
            setError(errorMessage(cause, 'Could not upload the video. Choose it again to retry.'));
          }
        }}
      />
      <Button
        variant="outline"
        isPending={upload.isPending}
        onPress={() => fileInput.current?.click()}
      >
        Upload a video
      </Button>
      <FormError message={error} />
      {validUrl(value) && (
        <a
          href={value}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center font-medium underline"
        >
          Open video (new tab)
        </a>
      )}
      {validUrl(value) && /\.(mp4|webm)(\?|$)/i.test(value) && (
        <video
          controls
          playsInline
          preload="metadata"
          src={value}
          aria-label="Workout video"
          className="max-h-80 w-full rounded-xl"
        >
          <track kind="captions" />
        </video>
      )}
    </section>
  );
}

function CreateWorkout({clientId}: {clientId?: string}) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string>();
  const save = useSaveWorkout(clientId);
  const navigate = useNavigate();
  return (
    <Page className="editor-page">
      <h1 className="page-title">Create workout</h1>
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (save.isPending) {
            return;
          }
          if (!name.trim()) {
            setError('Enter a workout name.');
            return;
          }
          try {
            const result = await save.mutateAsync({
              body: {name: name.trim(), description: null, type: 'prescribed', video: null, groups: []},
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
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
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

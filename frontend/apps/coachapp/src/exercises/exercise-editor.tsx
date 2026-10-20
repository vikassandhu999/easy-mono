import {defaultMetrics, metricCatalogue, metricKeys, metricLabel} from '@easy/workouts/metrics';
import {ArrowDown, ArrowUp, X} from 'lucide-react';
import {useEffect, useId, useRef, useState} from 'react';
import {type FieldPath, type FieldPathValue, useForm} from 'react-hook-form';
import {useNavigate, useParams} from 'react-router-dom';
import {errorMessage} from '../api/client';
import {
  type Exercise,
  type ExerciseCreate,
  useArchiveExercise,
  useCopyExercise,
  useDeleteExercise,
  useExercise,
  useRestoreExercise,
  useSaveExercise,
} from '../api/exercises';
import {useUploadLibraryMedia} from '../api/library-media';
import {Button} from '../ui/button';
import {Dialog, DialogHeader, DialogTitle} from '../ui/dialog';
import {FormError} from '../ui/form-error';
import {FormField} from '../ui/form-field';
import {Input} from '../ui/input';
import {useListLocation} from '../ui/list-location';
import {FormActions, Page, PageHeader} from '../ui/page';
import {exerciseBody, goals, kindLabels, kinds, move, placeLabels, places} from './exercise';

const selectClass = 'h-12 w-full min-w-0 rounded-xl border border-input bg-surface px-3';
type Metrics = NonNullable<ExerciseCreate['metrics']>;
type Media = NonNullable<ExerciseCreate['media']>;

export function ExerciseEditor() {
  const {id} = useParams();
  const query = useExercise(id === 'new' ? '' : (id ?? ''));
  if (!id || id === 'new') {
    return <Editor />;
  }
  if (!query.data) {
    return (
      <Page className="editor-page">
        <PageHeader
          title="Exercise"
          back={{to: '/exercises', label: 'Exercise library'}}
        />
        {query.isError ? (
          <>
            <FormError message={errorMessage(query.error, 'Could not load this exercise.')} />
            <Button
              onPress={() => {
                query.refetch();
              }}
            >
              Try again
            </Button>
          </>
        ) : (
          <p role="status">Loading exercise…</p>
        )}
      </Page>
    );
  }
  return (
    <Editor
      key={id}
      initial={query.data.data}
    />
  );
}

function Editor({initial}: {initial?: Exercise}) {
  const form = useForm<ExerciseCreate>({defaultValues: exerciseBody(initial)});
  const body = form.watch();
  const save = useSaveExercise();
  const copy = useCopyExercise();
  const remove = useDeleteExercise();
  const archive = useArchiveExercise();
  const restore = useRestoreExercise();
  const upload = useUploadLibraryMedia();
  const fileInput = useRef<HTMLInputElement>(null);
  const activeUpload = useRef<AbortController | null>(null);
  const navigate = useNavigate();
  const {to, state} = useListLocation('/exercises');
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState('');
  const [deleting, setDeleting] = useState(false);
  const readOnly = Boolean(initial?.is_builtin);
  const pending =
    save.isPending || copy.isPending || remove.isPending || archive.isPending || restore.isPending || upload.isPending;
  const set = <K extends FieldPath<ExerciseCreate>>(key: K, value: FieldPathValue<ExerciseCreate, K>) =>
    form.setValue(key, value, {shouldDirty: true});
  useEffect(() => () => activeUpload.current?.abort(), []);
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (form.formState.isDirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [form.formState.isDirty]);
  return (
    <Page className="editor-page">
      <PageHeader
        title={initial ? (readOnly ? 'Exercise details' : 'Edit exercise') : 'Create exercise'}
        description={
          readOnly
            ? 'Shared exercises are read-only. Copy this exercise to change it.'
            : 'Choose the metrics, instructions and demonstrations for this exercise.'
        }
        back={{to, label: 'Exercise library', state}}
        actions={
          initial && (
            <Button
              variant="outline"
              isPending={copy.isPending}
              isDisabled={pending || form.formState.isDirty}
              onPress={async () => {
                try {
                  const result = await copy.mutateAsync({id: initial.id});
                  navigate(`/exercises/${result.data.id}`, {state});
                } catch (cause) {
                  setError(errorMessage(cause, 'Could not copy this exercise.'));
                }
              }}
            >
              Copy exercise
            </Button>
          )
        }
      />
      {initial?.archived_at && (
        <p
          role="status"
          className="font-medium"
        >
          Archived. Existing workouts and recorded activity still use this exercise.
        </p>
      )}
      <form
        className="has-mobile-actions space-y-6"
        onSubmit={form.handleSubmit(async (values) => {
          if (readOnly || pending) {
            return;
          }
          try {
            const result = await save.mutateAsync(
              initial ? {kind: 'update', id: initial.id, body: values} : {kind: 'create', body: values},
            );
            form.reset(exerciseBody(result.data));
            setNotice('Exercise saved.');
            setError(undefined);
            if (!initial) {
              navigate(`/exercises/${result.data.id}`, {replace: true, state});
            }
          } catch (cause) {
            setError(errorMessage(cause, 'Could not save this exercise. Your changes are still here. Try again.'));
          }
        })}
      >
        <fieldset
          disabled={readOnly || pending}
          className="min-w-0 space-y-6"
        >
          <legend className="sr-only">Exercise information</legend>
          <FormField
            control={form.control}
            name="name"
            label="Exercise name"
            emphasis="title"
            isRequired
            maxLength={200}
            rules={{validate: (value) => Boolean(String(value).trim()) || 'Enter an exercise name.'}}
          />
          <label className="grid gap-1">
            <span className="text-sm font-medium">Kind</span>
            <select
              value={body.kind}
              className={selectClass}
              onChange={(event) => {
                const kind = kinds.find((value) => value === event.target.value);
                if (kind) {
                  set('kind', kind);
                  if (!initial) {
                    set(
                      'metrics',
                      defaultMetrics[kind].map((key) => ({key, label: null})),
                    );
                  }
                }
              }}
            >
              {kinds.map((kind) => (
                <option
                  key={kind}
                  value={kind}
                >
                  {kindLabels[kind]}
                </option>
              ))}
            </select>
          </label>
          <FormField
            control={form.control}
            name="instructions"
            label="Instructions (optional)"
            multiline
          />
          <Facet
            label="Goals"
            options={goals}
            value={body.goals ?? []}
            onChange={(value) => set('goals', value)}
          />
          <Facet
            label="Places"
            options={places}
            value={body.places ?? []}
            onChange={(value) => set('places', value)}
          />
          <MetricRows
            value={body.metrics ?? []}
            onChange={(value) => set('metrics', value)}
          />
          <FormField
            control={form.control}
            name="equipment"
            label="Equipment (optional)"
            multiline
          />
          <Tags
            label="Muscles"
            value={body.muscles ?? []}
            onChange={(value) => set('muscles', value)}
          />
          <section
            className="space-y-3"
            aria-labelledby="exercise-demonstrations"
          >
            <h2
              id="exercise-demonstrations"
              className="editor-section-title"
            >
              Demonstrations
            </h2>
            <p className="text-sm font-medium text-muted-foreground">
              Add photo or video links in the order the client should see them.
            </p>
            <MediaRows
              value={body.media ?? []}
              onChange={(value) => set('media', value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onPress={() => set('media', [...(body.media ?? []), {url: '', caption: null}])}
              >
                Add link
              </Button>
              <Button
                variant="outline"
                isPending={upload.isPending}
                onPress={() => fileInput.current?.click()}
              >
                Upload photo or video
              </Button>
            </div>
            <input
              ref={fileInput}
              type="file"
              className="sr-only"
              aria-label="Choose exercise photo or video"
              tabIndex={-1}
              accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (!file) {
                  return;
                }
                activeUpload.current?.abort();
                const controller = new AbortController();
                activeUpload.current = controller;
                setError(undefined);
                try {
                  const media = await upload.mutateAsync({file, signal: controller.signal});
                  if (!media.url) {
                    throw new Error('The uploaded file has no public URL.');
                  }
                  set('media', [...(form.getValues('media') ?? []), {url: media.url, caption: null}]);
                } catch (cause) {
                  if (!controller.signal.aborted) {
                    setError(errorMessage(cause, 'Could not upload the file. Choose it again to retry.'));
                  }
                }
              }}
            />
          </section>
        </fieldset>
        <FormError message={error} />
        <p role="status">{notice}</p>
        {!readOnly && (
          <FormActions>
            {initial && (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  isDisabled={pending || form.formState.isDirty}
                  isPending={archive.isPending || restore.isPending}
                  onPress={async () => {
                    try {
                      if (initial.archived_at) {
                        await restore.mutateAsync(initial.id);
                      } else {
                        await archive.mutateAsync(initial.id);
                      }
                      setNotice(initial.archived_at ? 'Exercise restored.' : 'Exercise archived.');
                      setError(undefined);
                    } catch (cause) {
                      setError(errorMessage(cause, 'Could not change the archive state. Try again.'));
                    }
                  }}
                >
                  {initial.archived_at ? 'Restore exercise' : 'Archive exercise'}
                </Button>
                <Button
                  variant="ghost"
                  isDisabled={pending}
                  onPress={() => setDeleting(true)}
                >
                  Delete exercise
                </Button>
              </div>
            )}
            <Button
              type="submit"
              isPending={save.isPending}
              isDisabled={pending}
            >
              Save exercise
            </Button>
          </FormActions>
        )}
      </form>
      {deleting && initial && (
        <Dialog
          isOpen
          onOpenChange={setDeleting}
        >
          <DialogHeader>
            <DialogTitle>Delete {initial.name}?</DialogTitle>
          </DialogHeader>
          <p>You can delete an exercise only when no workout or recorded activity uses it.</p>
          <FormError message={error} />
          <div className="flex gap-2">
            <Button
              variant="outline"
              onPress={() => setDeleting(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              isPending={remove.isPending}
              onPress={async () => {
                try {
                  await remove.mutateAsync(initial.id);
                  navigate(to, {state});
                } catch (cause) {
                  setError(errorMessage(cause, 'Could not delete this exercise.'));
                }
              }}
            >
              Delete exercise
            </Button>
          </div>
        </Dialog>
      )}
    </Page>
  );
}

function MetricRows({value, onChange}: {value: Metrics; onChange: (value: Metrics) => void}) {
  const id = useId();
  return (
    <section
      className="space-y-3"
      aria-labelledby="exercise-metrics"
    >
      <h2
        id="exercise-metrics"
        className="editor-section-title"
      >
        Metrics in display order
      </h2>
      <p className="text-sm font-medium text-muted-foreground">
        Each metric can have its own label. Leave the label empty to use its name.
      </p>
      <ol className="space-y-4">
        {value.map((metric, index) => (
          <li
            key={metric.key}
            className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"
          >
            <label className="grid gap-1">
              <span className="text-sm font-medium">Metric {index + 1}</span>
              <select
                className={selectClass}
                value={metric.key}
                onChange={(event) => {
                  const key = metricKeys.find((key) => key === event.target.value);
                  if (key) {
                    onChange(value.map((row, position) => (position === index ? {...row, key} : row)));
                  }
                }}
              >
                {metricKeys
                  .filter((key) => key === metric.key || !value.some((row) => row.key === key))
                  .map((key) => (
                    <option
                      key={key}
                      value={key}
                    >
                      {metricCatalogue[key].label}
                    </option>
                  ))}
              </select>
            </label>
            <label
              htmlFor={`${id}-${metric.key}-label`}
              className="grid gap-1"
            >
              <span className="text-sm font-medium">Metric {index + 1} label</span>
              <Input
                id={`${id}-${metric.key}-label`}
                value={metric.label ?? ''}
                maxLength={80}
                onChange={(event) =>
                  onChange(
                    value.map((row, position) => (position === index ? {...row, label: event.target.value} : row)),
                  )
                }
              />
            </label>
            <div className="flex justify-end gap-1">
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={`Move ${metricLabel(metric.key)} up`}
                isDisabled={index === 0}
                onPress={() => onChange(move(value, index, index - 1))}
              >
                <ArrowUp />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={`Move ${metricLabel(metric.key)} down`}
                isDisabled={index === value.length - 1}
                onPress={() => onChange(move(value, index, index + 1))}
              >
                <ArrowDown />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={`Remove ${metricLabel(metric.key)}`}
                onPress={() => onChange(value.filter((row) => row.key !== metric.key))}
              >
                <X />
              </Button>
            </div>
          </li>
        ))}
      </ol>
      <label className="grid gap-1">
        <span className="text-sm font-medium">Add metric</span>
        <select
          className={selectClass}
          value=""
          disabled={value.length === metricKeys.length}
          onChange={(event) => {
            const key = metricKeys.find((key) => key === event.target.value);
            if (key) {
              onChange([...value, {key, label: null}]);
            }
          }}
        >
          <option value="">Choose a metric</option>
          {metricKeys
            .filter((key) => !value.some((row) => row.key === key))
            .map((key) => (
              <option
                key={key}
                value={key}
              >
                {metricCatalogue[key].label}
              </option>
            ))}
        </select>
      </label>
    </section>
  );
}

function MediaRows({value, onChange}: {value: Media; onChange: (value: Media) => void}) {
  const id = useId();
  return (
    <ol className="space-y-4">
      {value.map((item, index) => (
        <li
          key={item.id ?? index}
          className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"
        >
          <label
            htmlFor={`${id}-${index}-url`}
            className="grid gap-1"
          >
            <span className="text-sm font-medium">Media {index + 1} URL</span>
            <Input
              id={`${id}-${index}-url`}
              type="url"
              value={item.url}
              required
              onChange={(event) =>
                onChange(value.map((row, position) => (position === index ? {...row, url: event.target.value} : row)))
              }
            />
          </label>
          <label
            htmlFor={`${id}-${index}-caption`}
            className="grid gap-1"
          >
            <span className="text-sm font-medium">Media {index + 1} caption (optional)</span>
            <Input
              id={`${id}-${index}-caption`}
              value={item.caption ?? ''}
              maxLength={1000}
              onChange={(event) =>
                onChange(
                  value.map((row, position) => (position === index ? {...row, caption: event.target.value} : row)),
                )
              }
            />
          </label>
          <div className="flex justify-end gap-1">
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={`Move media ${index + 1} up`}
              isDisabled={index === 0}
              onPress={() => onChange(move(value, index, index - 1))}
            >
              <ArrowUp />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={`Move media ${index + 1} down`}
              isDisabled={index === value.length - 1}
              onPress={() => onChange(move(value, index, index + 1))}
            >
              <ArrowDown />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={`Remove media ${index + 1}`}
              onPress={() => onChange(value.filter((_row, position) => position !== index))}
            >
              <X />
            </Button>
          </div>
        </li>
      ))}
    </ol>
  );
}

function Facet({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly string[];
  value: string[];
  onChange: (value: string[]) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium">{label} (optional)</legend>
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
        {options.map((option) => (
          <label
            key={option}
            className="flex min-h-11 items-center gap-2"
          >
            <input
              type="checkbox"
              checked={value.includes(option)}
              onChange={(event) =>
                onChange(event.target.checked ? [...value, option] : value.filter((item) => item !== option))
              }
            />
            {placeLabels[option] ?? `${option[0]?.toUpperCase()}${option.slice(1)}`}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Tags({label, value, onChange}: {label: string; value: string[]; onChange: (value: string[]) => void}) {
  const [draft, setDraft] = useState(value.join(', '));
  const id = useId();
  return (
    <div className="grid gap-1">
      <label
        htmlFor={id}
        className="text-sm font-medium"
      >
        {label}
      </label>
      <Input
        id={id}
        aria-describedby={`${id}-help`}
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          onChange([
            ...new Set(
              event.target.value
                .split(',')
                .map((tag) => tag.trim())
                .filter(Boolean),
            ),
          ]);
        }}
      />
      <span
        id={`${id}-help`}
        className="text-sm font-medium text-muted-foreground"
      >
        Separate names with commas.
      </span>
    </div>
  );
}

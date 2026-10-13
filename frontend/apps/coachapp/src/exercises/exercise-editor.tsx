import {ArrowDown, ArrowUp, X} from 'lucide-react';
import {useEffect, useId, useState} from 'react';
import {type FieldPath, type FieldPathValue, useForm} from 'react-hook-form';
import {useNavigate, useParams} from 'react-router-dom';
import {errorMessage} from '../api/client';
import {
  type Exercise,
  type ExerciseCreate,
  useCopyExercise,
  useDeleteExercise,
  useExercise,
  useSaveExercise,
} from '../api/exercises';
import {Button} from '../ui/button';
import {Dialog, DialogHeader, DialogTitle} from '../ui/dialog';
import {FormError} from '../ui/form-error';
import {FormField} from '../ui/form-field';
import {Input} from '../ui/input';
import {useListLocation} from '../ui/list-location';
import {FormActions, Page, PageHeader} from '../ui/page';
import {
  defaults,
  exerciseBody,
  goals,
  kindLabels,
  kinds,
  labelOf,
  metricKeys,
  move,
  placeLabels,
  places,
} from './exercise';

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
  const navigate = useNavigate();
  const {to, state} = useListLocation('/exercises');
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState('');
  const [deleting, setDeleting] = useState(false);
  const readOnly = Boolean(initial?.is_builtin);
  const pending = save.isPending || copy.isPending || remove.isPending;
  const set = <K extends FieldPath<ExerciseCreate>>(key: K, value: FieldPathValue<ExerciseCreate, K>) =>
    form.setValue(key, value, {shouldDirty: true});
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
            : 'Changes apply from now on. Past prescriptions keep their exercise details.'
        }
        back={{to, label: 'Exercise library', state}}
        actions={
          initial && (
            <Button
              variant="outline"
              isPending={copy.isPending}
              isDisabled={form.formState.isDirty}
              onPress={async () => {
                try {
                  const result = await copy.mutateAsync({id: initial.id, name: `${initial.name} copy`});
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
      <form
        className="has-mobile-actions space-y-6"
        onSubmit={form.handleSubmit(async (values) => {
          if (readOnly || pending) {
            return;
          }
          if (!values.metrics?.length || !values.goals?.length || !values.places?.length) {
            setError('Select at least one metric, goal and place.');
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
            maxLength={255}
            rules={{validate: (value) => Boolean(String(value).trim()) || 'Enter an exercise name.'}}
          />
          <label className="grid gap-1">
            <span className="text-sm font-medium">Kind</span>
            <select
              value={body.kind}
              className="h-12 rounded-xl border border-input bg-surface px-3"
              onChange={(event) => {
                const kind = kinds.find((value) => value === event.target.value);
                if (kind) {
                  set('kind', kind);
                  if (!initial) {
                    set('metrics', defaults[kind]);
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
          <label className="flex min-h-11 items-center gap-3">
            <input
              type="checkbox"
              checked={body.unilateral ?? false}
              onChange={(event) => set('unilateral', event.target.checked)}
            />
            Each side (unilateral)
          </label>
          <section className="space-y-3">
            <h2 className="editor-section-title">Metrics in display order</h2>
            <p className="text-sm font-medium text-muted-foreground">
              The builder and client show only these metrics, in this order.
            </p>
            <ol className="space-y-2">
              {(body.metrics ?? []).map((metric, index) => (
                <li
                  key={metric}
                  className="flex items-center gap-2 rounded-xl bg-muted px-3 py-1"
                >
                  <span className="min-w-0 flex-1 font-medium">
                    {labelOf(metric, {count_label: body.count_label ?? null})}
                  </span>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Move ${labelOf(metric)} up`}
                    isDisabled={index === 0}
                    onPress={() => set('metrics', move(body.metrics ?? [], index, index - 1))}
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Move ${labelOf(metric)} down`}
                    isDisabled={index === (body.metrics?.length ?? 0) - 1}
                    onPress={() => set('metrics', move(body.metrics ?? [], index, index + 1))}
                  >
                    <ArrowDown />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Remove ${labelOf(metric)}`}
                    onPress={() => set('metrics', body.metrics?.filter((key) => key !== metric) ?? [])}
                  >
                    <X />
                  </Button>
                </li>
              ))}
            </ol>
            <label className="grid gap-1">
              <span className="text-sm font-medium">Add metric</span>
              <select
                value=""
                className="h-12 rounded-xl border border-input bg-surface px-3"
                onChange={(event) => {
                  if (event.target.value) {
                    set('metrics', [...(body.metrics ?? []), event.target.value]);
                  }
                }}
              >
                <option value="">Choose a metric</option>
                {metricKeys
                  .filter((key) => !body.metrics?.includes(key))
                  .map((key) => (
                    <option
                      key={key}
                      value={key}
                    >
                      {labelOf(key)}
                    </option>
                  ))}
              </select>
            </label>
          </section>
          {body.metrics?.some((metric) => ['reps', 'successes', 'attempts'].includes(metric)) && (
            <FormField
              control={form.control}
              name="count_label"
              label="Count label (optional)"
              description="For example laps, waves or skips. Leave empty to use the metric names."
              maxLength={80}
            />
          )}
          {body.metrics?.includes('grade') && (
            <Tags
              label="Grade scale in order"
              value={body.grade_scale ?? []}
              onChange={(value) => set('grade_scale', value)}
              description="Separate steps with commas, from lowest to highest: V0, V1, V2."
            />
          )}
          <Tags
            label="Equipment"
            value={body.equipment ?? []}
            onChange={(value) => set('equipment', value)}
            description="Separate tags with commas."
          />
          <Tags
            label="Muscles"
            value={body.muscles ?? []}
            onChange={(value) => set('muscles', value)}
            description="Separate tags with commas."
          />
          <FormField
            control={form.control}
            name="media"
            label="Photo or video URL (optional)"
            type="url"
            description="Use a URL that starts with https:// or http://."
          />
        </fieldset>
        <FormError message={error} />
        <p role="status">{notice}</p>
        {!readOnly && (
          <FormActions>
            {initial && (
              <Button
                variant="ghost"
                isDisabled={pending}
                onPress={() => setDeleting(true)}
              >
                Delete exercise
              </Button>
            )}
            <Button
              type="submit"
              isPending={save.isPending}
            >
              Save exercise
            </Button>
          </FormActions>
        )}
      </form>
      {initial?.media && (
        <a
          className="inline-flex min-h-11 items-center font-medium underline"
          href={initial.media}
          target="_blank"
          rel="noreferrer"
        >
          Open photo or video (new tab)
        </a>
      )}
      {deleting && initial && (
        <Dialog
          isOpen
          onOpenChange={(open) => setDeleting(open)}
        >
          <DialogHeader>
            <DialogTitle>Delete {initial.name}?</DialogTitle>
          </DialogHeader>
          <p>Existing workout prescriptions keep their exercise details.</p>
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
      <legend className="text-sm font-medium">{label} (select at least one)</legend>
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
function Tags({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const [draft, setDraft] = useState(value.join(', '));
  const id = useId();
  return (
    <label
      htmlFor={id}
      className="grid gap-1"
    >
      <span className="text-sm font-medium">{label}</span>
      <Input
        id={id}
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
      <span className="text-sm font-medium text-muted-foreground">{description}</span>
    </label>
  );
}

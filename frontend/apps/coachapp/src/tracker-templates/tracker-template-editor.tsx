import {useState} from 'react';
import {useFieldArray, useForm} from 'react-hook-form';
import {generatePath, useNavigate, useParams} from 'react-router-dom';
import {ApiError, errorMessage} from '../api/client';
import {
  type TemplateCreate,
  type TrackerTemplate,
  useSaveTrackerTemplate,
  useTracker,
  useTrackerTemplate,
} from '../api/trackers';
import {routes} from '../routes';
import {Button} from '../ui/button';
import {FormError} from '../ui/form-error';
import {FormField} from '../ui/form-field';
import {useListLocation} from '../ui/list-location';
import {Page, PageHeader, Surface} from '../ui/page';
import {TrackerPicker} from '../ui/tracker-picker';
import {TrackerTiming} from '../ui/tracker-timing';

export function TrackerTemplateEditor() {
  const {id = ''} = useParams();
  const query = useTrackerTemplate(id);
  const back = useListLocation(routes.trackerTemplates);
  return (
    <Page className="editor-page">
      <PageHeader
        title={id ? 'Edit Tracker template' : 'Create Tracker template'}
        back={{to: back.to, label: 'Back to templates'}}
      />
      {!id || query.data ? (
        <TemplateForm
          key={id}
          template={query.data?.data}
        />
      ) : query.isPending ? (
        <p role="status">Loading template…</p>
      ) : (
        <>
          <FormError message={errorMessage(query.error, 'Could not load template.')} />
          <Button
            onPress={() => {
              query.refetch();
            }}
          >
            Try again
          </Button>
        </>
      )}
    </Page>
  );
}

function TrackerName({id}: {id: string}) {
  const query = useTracker(id);
  return (
    <h3 className="editor-item-title">
      {query.data?.data.name ?? 'Tracker'}
      {query.isError && (
        <Button
          variant="ghost"
          onPress={() => {
            query.refetch();
          }}
        >
          Retry name
        </Button>
      )}
    </h3>
  );
}

function TemplateForm({template}: {template: TrackerTemplate | undefined}) {
  const form = useForm<TemplateCreate>({
    defaultValues: {
      name: template?.name ?? '',
      description: template?.description ?? '',
      content: {items: template?.content.items ?? []},
    },
  });
  const items = useFieldArray({control: form.control, name: 'content.items'});
  const save = useSaveTrackerTemplate();
  const navigate = useNavigate();
  const [picking, setPicking] = useState(false);
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(template?.revision ?? 0);
  const [uncertain, setUncertain] = useState(false);
  const [conflict, setConflict] = useState(false);
  const savedTemplate = useTrackerTemplate(template?.id ?? '');
  async function reloadSaved() {
    const result = await savedTemplate.refetch();
    if (result.data) {
      form.reset({
        name: result.data.data.name,
        description: result.data.data.description,
        content: result.data.data.content,
      });
      setRevision(result.data.data.revision);
      setConflict(false);
      setNotice('The saved template is loaded.');
    }
  }
  const submit = form.handleSubmit(async (values) => {
    form.clearErrors();
    setNotice('');
    try {
      const body = {
        ...values,
        content: {
          items: values.content.items.map((item) => ({
            tracker_id: item.tracker_id,
            timing: item.timing,
            ...(item.timing === 'weekly' ? {weekday: item.weekday ?? 6} : {}),
          })),
        },
      };
      const result = await save.mutateAsync(
        template ? {id: template.id, body: {...body, expected_revision: revision}} : {body},
      );
      setRevision(result.data.revision);
      form.reset(values);
      setNotice('Tracker template saved.');
      if (!template) {
        navigate(generatePath(routes.trackerTemplate, {id: result.data.id}), {replace: true});
      }
    } catch (error) {
      form.setError('root', {message: errorMessage(error, 'Could not save. Your changes are still here.')});
      if (template && error instanceof ApiError && error.status === 409) {
        setConflict(true);
      }
      if (!template && (!(error instanceof ApiError) || error.status >= 500)) {
        setUncertain(true);
      }
    }
  });
  return (
    <form
      onSubmit={submit}
      noValidate
      className="space-y-6"
    >
      <Surface className="space-y-5">
        <FormField
          control={form.control}
          name="name"
          label="Template name"
          emphasis="title"
          isRequired
        />
        <FormField
          control={form.control}
          name="description"
          label="Description"
          multiline
        />
      </Surface>
      <section className="space-y-4">
        <h2 className="editor-section-title">Trackers and timing</h2>
        <p className="text-sm text-muted-foreground">
          Save the complete list together. Changes do not change client lists that were already copied.
        </p>
        {items.fields.map((item, index) => {
          const value = form.watch(`content.items.${index}`);
          return (
            <Surface
              key={item.id}
              className="space-y-4"
            >
              <TrackerName id={item.tracker_id} />
              <TrackerTiming
                timing={value.timing}
                weekday={value.weekday ?? 6}
                onChange={(timing, weekday) => {
                  form.setValue(`content.items.${index}.timing`, timing, {shouldDirty: true});
                  form.setValue(`content.items.${index}.weekday`, weekday, {shouldDirty: true});
                }}
              />
              <Button
                variant="ghost"
                onPress={() => items.remove(index)}
              >
                Remove Tracker
              </Button>
            </Surface>
          );
        })}
        {items.fields.length === 0 && <p>No Trackers added yet.</p>}
        <Button
          variant="outline"
          onPress={() => setPicking(!picking)}
        >
          {picking ? 'Close Tracker picker' : 'Add Tracker'}
        </Button>
        {picking && (
          <TrackerPicker
            onSelect={(tracker) => {
              if (form.getValues('content.items').some((item) => item.tracker_id === tracker.id)) {
                form.setError('root', {message: 'This Tracker is already in the template.'});
                return;
              }
              items.append({tracker_id: tracker.id, timing: 'weekly', weekday: 6});
              setPicking(false);
            }}
          />
        )}
      </section>
      <FormError message={form.formState.errors.root?.message} />
      {conflict && (
        <div className="space-y-3">
          <p>
            The saved template changed. Your draft is still here. Reloading replaces your draft with the saved version.
          </p>
          <Button
            variant="outline"
            isPending={savedTemplate.isFetching}
            onPress={() => {
              reloadSaved();
            }}
          >
            Reload saved template
          </Button>
          {savedTemplate.isError && <FormError message="Could not reload the template. Your draft is still here." />}
        </div>
      )}
      {notice && <p role="status">{notice}</p>}
      <Button
        type="submit"
        isPending={save.isPending}
        isDisabled={uncertain}
      >
        Save template
      </Button>
      {uncertain && (
        <p>
          Check the template list before you create another.{' '}
          <Button
            variant="outline"
            onPress={() => setUncertain(false)}
          >
            I checked the templates
          </Button>
        </p>
      )}
    </form>
  );
}

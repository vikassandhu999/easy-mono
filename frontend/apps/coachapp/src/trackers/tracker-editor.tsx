import {useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {generatePath, useNavigate, useParams} from 'react-router-dom';
import {ApiError, errorMessage} from '../api/client';
import {type Tracker, type TrackerCreate, useMaintainTracker, useSaveTracker, useTracker} from '../api/trackers';
import {routes} from '../routes';
import {Button} from '../ui/button';
import {FormError} from '../ui/form-error';
import {FormField} from '../ui/form-field';
import {useListLocation} from '../ui/list-location';
import {Page, PageHeader, Surface} from '../ui/page';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';

export function TrackerEditor() {
  const {id = ''} = useParams();
  const query = useTracker(id);
  const back = useListLocation(routes.trackers);
  return (
    <Page className="editor-page">
      <PageHeader
        title={id ? 'Tracker details' : 'Create Tracker'}
        back={{to: back.to, label: 'Back to Trackers'}}
      />
      {!id || query.data ? (
        <TrackerForm
          key={id}
          tracker={query.data?.data}
        />
      ) : query.isPending ? (
        <p role="status">Loading Tracker…</p>
      ) : (
        <>
          <FormError message={errorMessage(query.error, 'Could not load Tracker.')} />
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

function TrackerForm({tracker}: {tracker: Tracker | undefined}) {
  const form = useForm({
    defaultValues: {
      name: tracker?.name ?? '',
      kind: tracker?.kind ?? ('number' as Tracker['kind']),
      base_unit: tracker?.base_unit ?? '',
      scale_max: String(tracker?.scale_max ?? 5),
    },
  });
  const kind = form.watch('kind');
  const save = useSaveTracker();
  const maintain = useMaintainTracker(tracker?.id ?? '');
  const navigate = useNavigate();
  const [notice, setNotice] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const submit = form.handleSubmit(async (values) => {
    form.clearErrors();
    setNotice('');
    try {
      const body: TrackerCreate = {
        name: values.name.trim(),
        kind: values.kind,
        ...(kind === 'number' ? {base_unit: values.base_unit.trim() || null} : {}),
        ...(kind === 'rating' ? {scale_max: Number(values.scale_max)} : {}),
      };
      const result = await save.mutateAsync(tracker ? {id: tracker.id, name: values.name.trim()} : {body});
      form.reset({...values, name: result.data.name});
      setNotice('Tracker saved.');
      if (!tracker) {
        navigate(generatePath(routes.tracker, {id: result.data.id}), {replace: true});
      }
    } catch (error) {
      form.setError('root', {message: errorMessage(error, 'Could not save. Your values are still here.')});
      if (!tracker && (!(error instanceof ApiError) || error.status >= 500)) {
        setUncertain(true);
      }
    }
  });
  async function act(action: 'archive' | 'restore' | 'delete') {
    form.clearErrors();
    try {
      await maintain.mutateAsync(action);
      if (action === 'delete') {
        navigate(routes.trackers);
      } else {
        setNotice(action === 'archive' ? 'Tracker archived.' : 'Tracker restored.');
      }
    } catch (error) {
      form.setError('root', {message: errorMessage(error, 'Could not update this Tracker.')});
    }
  }
  return (
    <form
      className="space-y-6"
      onSubmit={submit}
      noValidate
    >
      <Surface className="space-y-5">
        <FormField
          control={form.control}
          name="name"
          label="Tracker name"
          emphasis="title"
          isRequired
          isDisabled={tracker?.built_in || save.isPending}
        />
        {tracker ? (
          <p className="text-sm text-muted-foreground">
            {tracker.built_in ? 'This built-in Tracker cannot be changed. ' : ''}Kind, unit, and scale are fixed when a
            Tracker is created. {tracker.kind.replace('_', '/')} {tracker.base_unit ?? ''}
            {tracker.scale_max ? ` · Scale 1–${tracker.scale_max}` : ''}.
          </p>
        ) : (
          <>
            <Controller
              control={form.control}
              name="kind"
              render={({field}) => (
                <SelectField
                  aria-label="Kind"
                  value={field.value}
                  onChange={field.onChange}
                >
                  {['number', 'rating', 'yes_no', 'text', 'photo', 'document'].map((value) => (
                    <SelectItem
                      key={value}
                      id={value}
                    >
                      {value.replace('_', '/')}
                    </SelectItem>
                  ))}
                </SelectField>
              )}
            />
            {kind === 'number' && (
              <FormField
                control={form.control}
                name="base_unit"
                label="Unit"
                description="Custom units are shown as entered and are not converted."
              />
            )}
            {kind === 'rating' && (
              <FormField
                control={form.control}
                name="scale_max"
                label="Maximum rating"
                type="number"
                isRequired
                rules={{
                  validate: (value) =>
                    (Number.isInteger(Number(value)) && Number(value) >= 2) || 'Enter a whole number of at least 2.',
                }}
              />
            )}
          </>
        )}
        <FormError message={form.formState.errors.root?.message} />
        {notice && <p role="status">{notice}</p>}
        {!tracker?.built_in && (
          <Button
            type="submit"
            isPending={save.isPending}
            isDisabled={uncertain}
          >
            {tracker ? 'Save name' : 'Create Tracker'}
          </Button>
        )}
        {uncertain && (
          <p className="text-sm">
            Check the library for the new Tracker before you create another. Your draft is still here.{' '}
            <Button
              variant="outline"
              onPress={() => setUncertain(false)}
            >
              I checked the library
            </Button>
          </p>
        )}
      </Surface>
      {tracker && !tracker.built_in && (
        <Surface className="space-y-4">
          <h2 className="editor-section-title">Manage Tracker</h2>
          <p className="text-sm">{tracker.entry_count} entries. Archive a used Tracker to keep its history.</p>
          <Button
            variant="outline"
            isPending={maintain.isPending}
            onPress={() => {
              act(tracker.archived_at ? 'restore' : 'archive');
            }}
          >
            {tracker.archived_at ? 'Restore Tracker' : 'Archive Tracker'}
          </Button>
          {tracker.entry_count === 0 && (
            <Button
              variant="ghost"
              onPress={() => setConfirmDelete(true)}
            >
              Delete unused Tracker
            </Button>
          )}
          {confirmDelete && (
            <div className="space-y-3">
              <p>Delete this Tracker permanently? The server checks all uses before deletion.</p>
              <Button
                variant="destructive"
                isPending={maintain.isPending}
                onPress={() => {
                  act('delete');
                }}
              >
                Confirm delete
              </Button>
              <Button
                variant="ghost"
                onPress={() => setConfirmDelete(false)}
              >
                Keep Tracker
              </Button>
            </div>
          )}
        </Surface>
      )}
    </form>
  );
}

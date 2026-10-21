import {useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {errorMessage} from '../api/client';
import {useTrackerSettings, useTrackerTemplate, useUpdateTrackerSettings} from '../api/trackers';
import {Button} from '../ui/button';
import {Checkbox} from '../ui/checkbox';
import {FormError} from '../ui/form-error';
import {Surface} from '../ui/page';
import {TrackerTemplatePicker} from '../ui/tracker-picker';

export function TrackerDefault() {
  const query = useTrackerSettings();
  return (
    <Surface className="space-y-4">
      <h2 className="section-title">Default Tracker template</h2>
      <p className="text-sm text-muted-foreground">
        The default is copied when a client starts coaching for the first time.
      </p>
      {query.data && query.isError && (
        <>
          <FormError message="Could not refresh the Tracker default. Your choice is still here." />
          <Button
            variant="outline"
            onPress={() => {
              query.refetch();
            }}
          >
            Retry Tracker default
          </Button>
        </>
      )}
      {query.data ? (
        <DefaultForm initialId={query.data.data.default_tracker_template_id} />
      ) : query.isPending ? (
        <p role="status">Loading Tracker default…</p>
      ) : (
        <>
          <FormError message={errorMessage(query.error, 'Could not load Tracker default.')} />
          <Button
            onPress={() => {
              query.refetch();
            }}
          >
            Retry Tracker default
          </Button>
        </>
      )}
    </Surface>
  );
}

function DefaultForm({initialId}: {initialId: string | null}) {
  const form = useForm({defaultValues: {default_tracker_template_id: initialId, apply_to_existing: false}});
  const selected = form.watch('default_tracker_template_id');
  const template = useTrackerTemplate(selected ?? '');
  const update = useUpdateTrackerSettings();
  const [picking, setPicking] = useState(false);
  const [notice, setNotice] = useState('');
  const submit = form.handleSubmit(async (values) => {
    form.clearErrors();
    setNotice('');
    try {
      await update.mutateAsync(values);
      form.reset({...values, apply_to_existing: false});
      setNotice('Tracker default saved.');
    } catch (error) {
      form.setError('root', {message: errorMessage(error, 'Could not save. Your choice is still here.')});
    }
  });
  return (
    <form
      className="space-y-4"
      onSubmit={submit}
    >
      <p>{selected ? (template.data?.data.name ?? 'Loading selected template…') : 'No default template'}</p>
      {template.isError && (
        <>
          <FormError message="Could not load the selected template." />
          <Button
            variant="outline"
            onPress={() => {
              template.refetch();
            }}
          >
            Retry selected template
          </Button>
        </>
      )}
      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          onPress={() => setPicking(!picking)}
        >
          Choose default template
        </Button>
        <Button
          variant="ghost"
          onPress={() => form.setValue('default_tracker_template_id', null, {shouldDirty: true})}
        >
          Clear default
        </Button>
      </div>
      {picking && (
        <TrackerTemplatePicker
          onSelect={(value) => {
            form.setValue('default_tracker_template_id', value.id, {shouldDirty: true});
            setPicking(false);
          }}
        />
      )}
      <Controller
        control={form.control}
        name="apply_to_existing"
        render={({field}) => (
          <Checkbox
            isSelected={field.value}
            onChange={field.onChange}
          >
            Apply to existing clients too
          </Checkbox>
        )}
      />
      <p className="text-sm text-muted-foreground">
        This replaces existing Tracker lists with the template. Their recorded history stays available.
      </p>
      <FormError message={form.formState.errors.root?.message} />
      {notice && <p role="status">{notice}</p>}
      <Button
        type="submit"
        isPending={update.isPending}
      >
        Save Tracker default
      </Button>
    </form>
  );
}

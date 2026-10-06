import {useRef, useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {generatePath, Link, useParams, useSearchParams} from 'react-router-dom';
import {ApiError, errorMessage} from '../api/client';
import {useClient} from '../api/clients';
import {
  type EntryCreate,
  type Tracker,
  useRecordTracker,
  useTracker,
  useUploadTrackerAttachment,
} from '../api/trackers';
import {routes} from '../routes';
import {Button, buttonVariants} from '../ui/button';
import {FormError} from '../ui/form-error';
import {FormField} from '../ui/form-field';
import {Input} from '../ui/input';
import {Page, PageHeader, Surface} from '../ui/page';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';
import {TrackerPicker} from '../ui/tracker-picker';
import {defaultTrackerUnit, type EntryFields, entryBody} from './entry';

export function RecordTracker() {
  const {clientId = ''} = useParams();
  const [params, setParams] = useSearchParams();
  const id = params.get('tracker_id') ?? '';
  const tracker = useTracker(id);
  const person = useClient(clientId);
  return (
    <Page className="editor-page">
      <PageHeader
        title="Record for client"
        description="The entry will show “Recorded by coach”."
        back={{to: generatePath(routes.clientTrackers, {clientId}), label: 'Back to client Trackers'}}
      />
      {!id ? (
        <TrackerPicker onSelect={(value) => setParams({tracker_id: value.id})} />
      ) : tracker.data && person.data ? (
        <RecordForm
          key={id}
          tracker={tracker.data.data}
          clientId={clientId}
          date={person.data.data.local_date}
          unitSystem={person.data.data.unit_system}
        />
      ) : tracker.isError || person.isError ? (
        <>
          <FormError message="Could not load the Tracker or client." />
          <Button
            onPress={() => {
              tracker.refetch();
              person.refetch();
            }}
          >
            Try again
          </Button>
        </>
      ) : (
        <p role="status">Loading recording form…</p>
      )}
    </Page>
  );
}

type DraftFile = {key: string; file: File; attachmentId?: string};
function RecordForm({
  tracker,
  clientId,
  date,
  unitSystem,
}: {
  tracker: Tracker;
  clientId: string;
  date: string;
  unitSystem: 'metric' | 'imperial';
}) {
  const form = useForm<EntryFields>({
    defaultValues: {
      local_date: date,
      value: '',
      unit: defaultTrackerUnit(tracker, unitSystem),
      text: '',
      answer: '',
      captured_on: '',
    },
  });
  const record = useRecordTracker(clientId);
  const upload = useUploadTrackerAttachment(clientId);
  const [files, setFiles] = useState<DraftFile[]>([]);
  const filesRef = useRef(files);
  const attempt = useRef<EntryCreate | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const [saved, setSaved] = useState(false);
  const pending = form.formState.isSubmitting;
  function updateFiles(next: DraftFile[]) {
    filesRef.current = next;
    setFiles(next);
  }
  const submit = form.handleSubmit(async (fields) => {
    form.clearErrors();
    if ((tracker.kind === 'document' || tracker.kind === 'photo') && filesRef.current.length === 0) {
      form.setError('root', {message: 'Choose at least one file.'});
      return;
    }
    try {
      if (!attempt.current) {
        for (const item of filesRef.current) {
          if (!item.attachmentId) {
            const result = await upload.mutateAsync({file: item.file, capturedOn: fields.captured_on});
            updateFiles(
              filesRef.current.map((value) => (value.key === item.key ? {...value, attachmentId: result.id} : value)),
            );
          }
        }
        attempt.current = entryBody(
          tracker,
          fields,
          filesRef.current.flatMap((item) => (item.attachmentId ? [item.attachmentId] : [])),
          crypto.randomUUID(),
        );
      }
      await record.mutateAsync(attempt.current);
      attempt.current = null;
      setUncertain(false);
      setSaved(true);
    } catch (error) {
      const unknown = !(error instanceof ApiError) || error.status >= 500 || error.status === 408;
      if (attempt.current && unknown) {
        setUncertain(true);
        form.setError('root', {
          message: 'The save response did not arrive. Your exact entry is kept. Check entry save to retry safely.',
        });
      } else {
        attempt.current = null;
        setUncertain(false);
        form.setError('root', {
          message: errorMessage(
            error,
            error instanceof Error ? error.message : 'Could not save. Your entry and files are still here.',
          ),
        });
      }
    }
  });
  if (saved) {
    return (
      <Surface className="space-y-4">
        <h2 className="editor-section-title">Entry saved</h2>
        <p>{tracker.name} · Recorded by coach</p>
        <Link
          className={buttonVariants()}
          to={`${generatePath(routes.trackerHistory, {clientId})}?tracker_id=${tracker.id}`}
        >
          View Tracker history
        </Link>
        <Button
          variant="outline"
          onPress={() => {
            setSaved(false);
            form.reset({...form.getValues(), value: '', text: '', answer: ''});
            updateFiles([]);
          }}
        >
          Record another entry
        </Button>
      </Surface>
    );
  }
  return (
    <form
      className="space-y-6"
      onSubmit={submit}
      noValidate
    >
      <Surface className="space-y-5">
        <h2 className="editor-section-title">{tracker.name}</h2>
        <fieldset
          disabled={pending || uncertain}
          className="space-y-5 min-w-0"
        >
          <FormField
            control={form.control}
            name="local_date"
            label="Local date"
            type="date"
            isRequired
          />
          {(tracker.kind === 'number' || tracker.kind === 'rating') && (
            <FormField
              control={form.control}
              name="value"
              label={tracker.kind === 'rating' ? 'Rating' : 'Value'}
              inputMode="decimal"
              isRequired
              rules={{
                validate: (value) => {
                  const number = Number(value);
                  return (
                    (value.trim() !== '' &&
                      Number.isFinite(number) &&
                      (tracker.kind !== 'rating' ||
                        (Number.isInteger(number) && number >= 1 && number <= (tracker.scale_max ?? 5)))) ||
                    (tracker.kind === 'rating' ? `Enter a rating from 1 to ${tracker.scale_max}.` : 'Enter a number.')
                  );
                },
              }}
            />
          )}
          {tracker.kind === 'number' &&
            (tracker.units.length > 1 ? (
              <Controller
                control={form.control}
                name="unit"
                render={({field}) => (
                  <SelectField
                    aria-label="Unit"
                    value={field.value}
                    onChange={field.onChange}
                  >
                    {tracker.units.map((option) => (
                      <SelectItem
                        key={option.unit}
                        id={option.unit}
                      >
                        {option.unit}
                      </SelectItem>
                    ))}
                  </SelectField>
                )}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Unit: {form.getValues('unit') || 'No unit'}</p>
            ))}
          {tracker.kind === 'yes_no' && (
            <Controller
              control={form.control}
              name="answer"
              rules={{required: 'Choose Yes or No.'}}
              render={({field, fieldState}) => (
                <div className="space-y-2">
                  <SelectField
                    aria-label="Answer"
                    value={field.value}
                    onChange={field.onChange}
                  >
                    <SelectItem id="yes">Yes</SelectItem>
                    <SelectItem id="no">No</SelectItem>
                  </SelectField>
                  <FormError message={fieldState.error?.message} />
                </div>
              )}
            />
          )}
          {tracker.kind === 'text' && (
            <FormField
              control={form.control}
              name="text"
              label="Text"
              multiline
              isRequired
            />
          )}
          {(tracker.kind === 'photo' || tracker.kind === 'document') && (
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="captured_on"
                label="Captured on"
                type="date"
                description="Optional date the photo or report was captured."
              />
              <label
                htmlFor="tracker-files"
                className="grid gap-2 text-sm font-medium"
              >
                Files
                <Input
                  id="tracker-files"
                  type="file"
                  multiple
                  accept={
                    tracker.kind === 'photo'
                      ? 'image/jpeg,image/png,image/webp,image/heic'
                      : 'application/pdf,image/jpeg,image/png,image/webp,image/heic'
                  }
                  onChange={(event) => {
                    const added = Array.from(event.target.files ?? []).map((file) => ({
                      file,
                      key: crypto.randomUUID(),
                    }));
                    updateFiles([...filesRef.current, ...added]);
                    event.target.value = '';
                  }}
                />
              </label>
              <p className="text-sm text-muted-foreground">One report per entry. Files appear in the order shown.</p>
              <ol className="space-y-3">
                {files.map((item, index) => (
                  <li
                    key={item.key}
                    className="space-y-2"
                  >
                    <p className="break-all">
                      {index + 1}. {item.file.name}
                      {item.attachmentId ? ' · Uploaded' : ''}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="ghost"
                        isDisabled={index === 0}
                        aria-label={`Move ${item.file.name} up`}
                        onPress={() => {
                          const next = [...files];
                          const previous = next[index - 1];
                          if (previous) {
                            next[index - 1] = item;
                            next[index] = previous;
                            updateFiles(next);
                          }
                        }}
                      >
                        Move up
                      </Button>
                      <Button
                        variant="ghost"
                        onPress={() => updateFiles(files.filter((value) => value.key !== item.key))}
                      >
                        Remove file
                      </Button>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </fieldset>
        <FormError message={form.formState.errors.root?.message} />
        <Button
          type="submit"
          isPending={pending}
        >
          {uncertain ? 'Check entry save' : 'Record entry'}
        </Button>
      </Surface>
    </form>
  );
}

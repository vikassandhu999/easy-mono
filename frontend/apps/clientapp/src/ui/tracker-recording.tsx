import {useEffect, useState} from 'react';
import {TextField} from 'react-aria-components';
import {uploadAttachment, validateAttachment, validatePhoto} from '../api/attachments';
import {useProfile} from '../api/auth';
import {ApiError, errorMessage} from '../api/client';
import {readPhotos, removePhoto, type StoredPhoto, savePhoto} from '../api/photo-store';
import {getSession} from '../api/session';
import {type Tracker, type TrackerEntry, type TrackerEvent, useSaveTracker} from '../api/trackers';
import {Button} from './button';
import {useCoaching} from './coaching';
import {useOnline} from './connection-status';
import {DraftStatus} from './draft-status';
import {FormError} from './form-error';
import {Input} from './input';
import {Label} from './label';
import {SelectItem} from './select';
import {SelectField} from './select-field';
import {Textarea} from './textarea';
import {
  parseTrackerDraft,
  restoreTrackerFiles,
  reviewTrackerDraft,
  settledTrackerDraft,
  trackerDraft,
  trackerInput,
} from './tracker-draft';
import {useDurableDraft} from './use-durable-draft';

export function TrackerRecording({
  tracker,
  date,
  event,
  entry,
  onSaved,
}: {
  tracker: Tracker;
  date: string;
  event?: TrackerEvent;
  entry?: TrackerEntry;
  onSaved: () => void;
}) {
  const profile = useProfile().data?.data;
  const session = getSession();
  const resource = `tracker.${tracker.id}.${entry?.id ?? event?.about_session_id ?? event?.about_meal_id ?? 'new'}`;
  const initial = trackerDraft(resource, tracker, date, profile?.unit_system ?? 'metric', entry);
  const controller = useDurableDraft({
    initial,
    resource,
    parse: (raw) => parseTrackerDraft(raw, resource),
    label: 'Tracker',
  });
  const {draft, update} = controller;
  const [files, setFiles] = useState<StoredPhoto[]>([]);
  const [filesLoaded, setFilesLoaded] = useState(false);
  const fileResource = draft ? `${resource}.${draft.fileGroup}` : '';
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState(false);
  const save = useSaveTracker();
  const online = useOnline();
  const {canWrite} = useCoaching();
  useEffect(() => {
    if (!session?.accountId || !fileResource) {
      return;
    }
    let current = true;
    setFilesLoaded(false);
    readPhotos(session.accountId, fileResource)
      .then(async (rows) => {
        if (!current || getSession()?.id !== session.id) {
          return;
        }
        if (
          rows.length &&
          !(await update(
            (saved) =>
              restoreTrackerFiles(
                saved,
                rows.map((row) => row.id),
              ),
            true,
          ))
        ) {
          throw new Error('Your file order could not be restored. Reopen this screen to retry.');
        }
        if (current) {
          setFiles(rows);
          setFilesLoaded(true);
        }
      })
      .catch(() => {
        if (current) {
          setError('Your files could not be opened. Reopen this screen to retry.');
        }
      });
    return () => {
      current = false;
    };
  }, [session?.accountId, session?.id, fileResource, update]);
  if (controller.loadError) {
    return <FormError message={controller.loadError} />;
  }
  if (!draft) {
    return <p role="status">Opening your Tracker draft…</p>;
  }
  const locked = busy || !filesLoaded || Boolean(draft.attempt) || !canWrite;
  const ordered = draft.files.flatMap((id) => {
    const file = files.find((item) => item.id === id);
    return file ? [file] : [];
  });
  async function addFiles(selected: FileList | null) {
    if (!selected || !session?.accountId || !draft) {
      return;
    }
    setBusy(true);
    setError('');
    try {
      const selectedFiles = Array.from(selected);
      for (const file of selectedFiles) {
        if (tracker.kind === 'photo') {
          validatePhoto(file);
        } else if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
          validateAttachment(file);
        } else {
          throw new Error('Choose PDF or image files.');
        }
      }
      if (!(await update((current) => current, true))) {
        throw new Error('Your file draft could not be kept safely. Try again.');
      }
      for (const file of selectedFiles) {
        const item: StoredPhoto = {
          id: crypto.randomUUID(),
          owner: session.accountId,
          resource: fileResource,
          name: file.name,
          blob: file,
          capturedOn: draft.capturedOn,
        };
        await savePhoto(item, () => getSession()?.id === session.id);
        if (!(await update((current) => ({...current, files: [...current.files, item.id]}), true))) {
          throw new Error('Your file order could not be saved. Reopen this screen to recover the file.');
        }
        setFiles((current) => [...current, item]);
      }
    } catch (cause) {
      setError(errorMessage(cause, 'Your files could not be kept on this device.'));
    } finally {
      setBusy(false);
    }
  }
  async function submit() {
    if (!draft || !session || !online || !canWrite) {
      return;
    }
    setBusy(true);
    setError('');
    try {
      let input = draft.attempt;
      if (!input) {
        const ids = entry?.attachments.map((item) => item.id) ?? [];
        if (ordered.length !== draft.files.length) {
          throw new Error('A draft file is missing. Remove it and choose it again before saving.');
        }
        for (const file of ordered) {
          ids.push((await uploadAttachment(file, session.id)).attachmentId ?? '');
        }
        input = trackerInput(draft, tracker, ids, event);
        if (!(await update((current) => ({...current, attempt: input}), true))) {
          throw new Error('Your request could not be kept safely. No entry was sent.');
        }
      }
      const accepted = await save.mutateAsync({
        input,
        ...(entry ? {id: entry.id, revision: draft.expectedRevision} : {}),
      });
      if (getSession()?.id !== session.id) {
        return;
      }
      if (
        !(await update(
          (current) => settledTrackerDraft(current, accepted.data, date, profile?.unit_system ?? 'metric'),
          true,
        ))
      ) {
        throw new Error('Your entry was saved. Check the save again to clear this draft.');
      }
      for (const file of ordered) {
        await removePhoto(file.id);
      }
      setFiles([]);
      onSaved();
    } catch (cause) {
      setConflict(cause instanceof ApiError && cause.status === 409);
      if (cause instanceof ApiError && cause.status >= 400 && cause.status < 500 && cause.status !== 409) {
        await update((current) => ({...current, attempt: null}), true);
      }
      setError(
        errorMessage(
          cause,
          'The save could not be confirmed. Your draft and request are kept. Check the save when connected.',
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="space-y-4 rounded-3xl bg-surface p-5"
      aria-label={`Record ${tracker.name}`}
    >
      <h2 className="text-lg font-semibold">
        {entry ? 'Correct' : 'Record'} {tracker.name}
      </h2>
      <FormError message={error} />
      {conflict && entry && (
        <section className="space-y-3 rounded-2xl border p-4">
          <h3 className="font-semibold">Review the saved entry</h3>
          <p className="text-sm">
            The saved entry is revision {entry.revision}, dated {entry.local_date}. Saved value:{' '}
            {entry.number_value ??
              entry.rating_value ??
              entry.text_value ??
              (entry.yes_no_value === null ? 'Files' : entry.yes_no_value ? 'Yes' : 'No')}
            {entry.number_value !== null ? ` ${tracker.base_unit ?? ''}` : ''}.
          </p>
          <p className="text-sm">
            Your draft value is {draft.value || 'a file entry'}, dated {draft.date}. Apply it to this revision only
            after review.
          </p>
          <Button
            variant="outline"
            onPress={async () => {
              if (await update((current) => reviewTrackerDraft(current, entry.revision), true)) {
                setConflict(false);
                setError('');
              }
            }}
          >
            Use latest revision with my draft
          </Button>
        </section>
      )}

      <DraftStatus state={controller.state} />
      <TextField
        value={draft.date}
        onChange={(date) => {
          update((d) => ({...d, date}));
        }}
        isDisabled={locked}
      >
        <Label>Date</Label>
        <Input type="date" />
      </TextField>
      {(tracker.kind === 'number' || tracker.kind === 'text') && (
        <TextField
          value={draft.value}
          onChange={(value) => {
            update((d) => ({...d, value}));
          }}
          isDisabled={locked}
        >
          <Label>{tracker.kind === 'number' ? 'Value' : 'Your text'}</Label>
          {tracker.kind === 'text' ? <Textarea /> : <Input inputMode="decimal" />}
        </TextField>
      )}
      {tracker.kind === 'number' && tracker.units.length > 0 && (
        <SelectField
          aria-label="Unit"
          value={draft.unit}
          isDisabled={locked}
          onChange={(unit) => {
            update((d) => ({...d, unit}));
          }}
        >
          {tracker.units.map((item) => (
            <SelectItem
              key={item.unit}
              id={item.unit}
            >
              {item.unit}
            </SelectItem>
          ))}
        </SelectField>
      )}
      {tracker.kind === 'rating' && (
        <SelectField
          aria-label="Rating"
          value={draft.value}
          placeholder="Choose a rating"
          isDisabled={locked}
          onChange={(value) => {
            update((d) => ({...d, value}));
          }}
        >
          {Array.from({length: tracker.scale_max ?? 5}, (_, i) => (
            <SelectItem
              key={i + 1}
              id={String(i + 1)}
            >
              {String(i + 1)}
            </SelectItem>
          ))}
        </SelectField>
      )}
      {tracker.kind === 'yes_no' && (
        <SelectField
          aria-label="Answer"
          value={draft.value}
          placeholder="Choose Yes or No"
          isDisabled={locked}
          onChange={(value) => {
            update((d) => ({...d, value}));
          }}
        >
          <SelectItem id="true">Yes</SelectItem>
          <SelectItem id="false">No</SelectItem>
        </SelectField>
      )}
      {(tracker.kind === 'photo' || tracker.kind === 'document') && (
        <div className="space-y-3">
          <TextField
            value={draft.capturedOn}
            onChange={(capturedOn) => {
              update((d) => ({...d, capturedOn}));
            }}
            isDisabled={locked || draft.files.length > 0}
          >
            <Label>File date</Label>
            <Input type="date" />
          </TextField>
          <p className="text-sm text-muted-foreground">
            {tracker.kind === 'document'
              ? 'Choose the file date before adding files. One report, in file order. PDF or images, up to 15 MiB per file.'
              : 'Images, up to 15 MiB per file.'}
          </p>
          <label className="block text-sm font-medium">
            {tracker.kind === 'document' ? 'Report files' : 'Photos'}
            <input
              className="mt-2 block w-full text-sm"
              type="file"
              accept={
                tracker.kind === 'document'
                  ? 'application/pdf,image/jpeg,image/png,image/webp,image/heic'
                  : 'image/jpeg,image/png,image/webp,image/heic'
              }
              multiple
              disabled={locked}
              onChange={(e) => {
                addFiles(e.currentTarget.files);
                e.currentTarget.value = '';
              }}
            />
          </label>
          {entry?.attachments.length ? (
            <p className="text-sm">{entry.attachments.length} saved files are kept. New files follow them.</p>
          ) : null}
          <ol className="space-y-2">
            {draft.files.map((id, index) => (
              <li
                key={id}
                className="rounded-xl border p-3 space-y-2"
              >
                <p className="break-all">
                  {index + 1}. {files.find((f) => f.id === id)?.name ?? 'Missing file'}
                  <span className="block text-xs text-muted-foreground">
                    Captured {files.find((f) => f.id === id)?.capturedOn ?? draft.capturedOn}
                  </span>
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    isDisabled={locked || index === 0}
                    onPress={() => {
                      update((d) => {
                        const list = [...d.files];
                        const prev = list[index - 1];
                        if (prev) {
                          list[index - 1] = id;
                          list[index] = prev;
                        }
                        return {...d, files: list};
                      });
                    }}
                  >
                    Move up
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    isDisabled={locked}
                    onPress={() => {
                      update((d) => ({...d, files: d.files.filter((f) => f !== id)}), true).then((ok) => {
                        if (ok) {
                          removePhoto(id);
                        }
                      });
                    }}
                  >
                    Remove file
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
      {draft.attempt && (
        <p
          role="status"
          className="text-sm"
        >
          The previous save needs confirmation. Check it before changing this entry.
        </p>
      )}
      <Button
        isDisabled={busy || !filesLoaded || !online || !canWrite}
        onPress={() => {
          submit();
        }}
      >
        {busy ? 'Saving…' : draft.attempt ? 'Check Tracker save' : entry ? 'Save correction' : 'Save entry'}
      </Button>
    </section>
  );
}

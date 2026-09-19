import {useEffect, useRef, useState} from 'react';
import {uploadPhoto, useAttachmentUrls, validatePhoto} from '../api/attachments';
import {readDraft, removeDraft} from '../api/drafts';
import {readPhotos, removePhoto, type StoredPhoto, savePhoto} from '../api/photo-store';
import {getSession} from '../api/session';
import {isNative} from '../api/storage';
import {Button} from '../ui/button';
import {useOnline} from '../ui/connection-status';
import {pickNativePhoto} from '../ui/photo-picker';

function Preview({blob, label}: {blob: Blob; label: string}) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  return url ? (
    <img
      src={url}
      alt={label}
      className="h-32 w-full rounded-xl object-cover"
    />
  ) : null;
}
export function SavedPhotos({ids}: {ids: string[]}) {
  const query = useAttachmentUrls(ids);
  const online = useOnline();
  const [failed, setFailed] = useState(false);
  return (
    <div className="space-y-2">
      {query.data?.data.map((photo, index) => (
        <a
          key={photo.id}
          href={photo.download_url}
          target="_blank"
          rel="noreferrer"
          className="block text-link"
        >
          {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: Image loading failure is not an interaction. */}
          <img
            key={`${photo.id}:${query.dataUpdatedAt}`}
            src={photo.download_url}
            alt={`Progress view ${index + 1}`}
            className="max-h-72 w-full rounded-xl object-contain"
            onError={() => setFailed(true)}
          />
          Open photo {index + 1}
        </a>
      ))}
      {query.isPending && ids.length > 0 && (
        <p role="status">{online ? 'Loading photos…' : 'Reconnect to view uploaded photos.'}</p>
      )}
      {(query.isError || failed) && (
        <>
          <p role="alert">{online ? 'Photos could not be loaded.' : 'Reconnect to view uploaded photos.'}</p>
          <Button
            variant="outline"
            isDisabled={!online}
            onPress={() => {
              query.refetch();
              setFailed(false);
            }}
          >
            Retry photos
          </Button>
        </>
      )}
    </div>
  );
}
export function Photos({
  resource,
  shape,
  value,
  onChange,
  disabled,
  label,
  onWork,
}: {
  resource: string;
  shape: string;
  value: string[];
  onChange: (ids: string[]) => void;
  disabled: boolean;
  label: string;
  onWork: (resource: string, pending: boolean) => void;
}) {
  const [photos, setPhotos] = useState<StoredPhoto[]>([]);
  const online = useOnline();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const current = useRef({value, onChange});
  current.current = {value, onChange};
  const [session] = useState(getSession);
  useEffect(() => {
    onWork(resource, !ready || busy || photos.some((photo) => !photo.attachmentId));
    return () => onWork(resource, false);
  }, [resource, ready, busy, photos, onWork]);
  const isCurrent = () => Boolean(session && getSession()?.id === session.id);
  useEffect(() => {
    let active = true;
    if (!session?.accountId) {
      return;
    }
    readPhotos(session.accountId, resource)
      .then((rows) => {
        if (!active || getSession()?.id !== session.id) {
          return;
        }
        setPhotos(rows);
        const uploaded = rows.flatMap((row) =>
          row.attachmentId && row.questionShape === shape ? [row.attachmentId] : [],
        );
        current.current.onChange([...new Set([...current.current.value, ...uploaded])]);
        setReady(true);
      })
      .catch(() => {
        if (active) {
          setError('Photos could not be restored on this device. Reopen this screen to retry.');
        }
      });
    readDraft(session.id, `${resource}.picker-error`)
      .then((message) => {
        if (active && typeof message === 'string') {
          setError(message);
          removeDraft(session.id, `${resource}.picker-error`);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [resource, session, shape]);
  const upload = async (photo: StoredPhoto) => {
    if (!session) {
      return;
    }
    setBusy(true);
    setError('');
    try {
      const uploaded = await uploadPhoto({...photo, questionShape: shape}, session.id);
      if (!isCurrent()) {
        return;
      }
      setPhotos((rows) => rows.map((row) => (row.id === photo.id ? uploaded : row)));
      if (uploaded.attachmentId && uploaded.questionShape === shape) {
        current.current.onChange([...new Set([...current.current.value, uploaded.attachmentId])]);
      }
    } catch (error) {
      if (isCurrent()) {
        setError(error instanceof Error ? error.message : 'Photo upload failed. Your photo is kept here to retry.');
      }
    } finally {
      setBusy(false);
    }
  };
  const add = async (file: File) => {
    if (!session?.accountId || value.length + photos.filter((photo) => !photo.attachmentId).length >= 4) {
      return;
    }
    setError('');
    setBusy(true);
    try {
      validatePhoto(file);
      const photo = {
        id: crypto.randomUUID(),
        owner: session.accountId,
        resource,
        blob: file,
        name: file.name,
        questionShape: shape,
      };
      await savePhoto(photo, isCurrent);
      if (!isCurrent()) {
        return;
      }
      setPhotos((rows) => [...rows, photo]);
      if (online) {
        await upload(photo);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Photo could not be kept on this device.');
    } finally {
      setBusy(false);
    }
  };
  const pick = async (source: 'camera' | 'gallery') => {
    setBusy(true);
    setError('');
    try {
      const photo = await pickNativePhoto(source, resource, shape);
      if (photo && isCurrent()) {
        setPhotos((rows) => [...rows, photo]);
        if (online) {
          await upload(photo);
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'The photo could not be opened. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  const remove = async (photo: StoredPhoto) => {
    try {
      await removePhoto(photo.id);
      setPhotos((rows) => rows.filter((row) => row.id !== photo.id));
      current.current.onChange(current.current.value.filter((id) => id !== photo.attachmentId));
    } catch {
      setError('The photo could not be removed. Please try again.');
    }
  };
  const reuse = async (photo: StoredPhoto) => {
    try {
      const updated = {...photo, questionShape: shape};
      await savePhoto(updated, isCurrent);
      setPhotos((rows) => rows.map((row) => (row.id === photo.id ? updated : row)));
      if (photo.attachmentId) {
        current.current.onChange([...new Set([...current.current.value, photo.attachmentId])]);
      }
    } catch {
      setError('The photo could not be added to this question. Please try again.');
    }
  };
  const full = value.length + photos.filter((photo) => !photo.attachmentId).length >= 4;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Up to 4 photos, 15 MB each. Photos upload when connected.</p>
      {photos.map((photo, index) => (
        <div
          key={photo.id}
          className="space-y-1"
        >
          <Preview
            blob={photo.blob}
            label={`${label}, photo ${index + 1}`}
          />
          <div className="flex items-center justify-between">
            <span className="text-sm">
              {photo.questionShape !== shape
                ? 'From an earlier question'
                : photo.attachmentId
                  ? 'Photo uploaded'
                  : 'Not uploaded yet'}
            </span>
            <Button
              variant="ghost"
              isDisabled={disabled || busy}
              onPress={() => remove(photo)}
            >
              Remove photo {index + 1}
            </Button>
          </div>
          {photo.attachmentId && photo.questionShape !== shape && (
            <Button
              variant="outline"
              isDisabled={disabled || busy || full}
              onPress={() => reuse(photo)}
            >
              Use photo {index + 1}
            </Button>
          )}
          {!photo.attachmentId && (
            <Button
              variant="outline"
              isDisabled={disabled || busy || !online}
              onPress={() => upload(photo)}
            >
              Retry photo {index + 1}
            </Button>
          )}
        </div>
      ))}
      {value
        .filter((id) => !photos.some((photo) => photo.attachmentId === id))
        .map((id, index) => (
          <div key={id}>
            <SavedPhotos ids={[id]} />
            <Button
              variant="ghost"
              isDisabled={disabled || busy}
              onPress={() => current.current.onChange(current.current.value.filter((value) => value !== id))}
            >
              Remove uploaded photo {index + 1}
            </Button>
          </div>
        ))}
      {!full && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            isDisabled={disabled || busy || !ready}
            onPress={() => (isNative ? pick('gallery') : input.current?.click())}
          >
            Choose photo
          </Button>
          {isNative && (
            <Button
              variant="outline"
              isDisabled={disabled || busy || !ready}
              onPress={() => pick('camera')}
            >
              Take photo
            </Button>
          )}
        </div>
      )}
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        aria-label={`Choose ${label}`}
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) {
            add(file);
          }
        }}
      />
      {busy && <p role="status">Preparing your photo…</p>}
      {error && (
        <p
          role="alert"
          className="text-sm text-destructive"
        >
          {error}
        </p>
      )}
    </div>
  );
}

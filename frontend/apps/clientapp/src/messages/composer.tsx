import {useEffect, useRef, useState} from 'react';
import {useForm, useWatch} from 'react-hook-form';
import {uploadAttachment, validateAttachment} from '../api/attachments';
import {ApiError} from '../api/client';
import {useSendMessage} from '../api/conversation';
import {readDraft, removeDraft} from '../api/drafts';
import {removePhoto, type StoredPhoto, savePhoto} from '../api/photo-store';
import {getSession} from '../api/session';
import {isNative} from '../api/storage';
import {Button} from '../ui/button';
import {Confirm} from '../ui/confirm';
import {useOnline} from '../ui/connection-status';
import {DraftStatus} from '../ui/draft-status';
import {FormError} from '../ui/form-error';
import {FormField} from '../ui/form-field';
import {useMessageScroller} from '../ui/message-scroller';
import {pickNativePhoto} from '../ui/photo-picker';
import {messageAttempt, messageResource} from './message-draft';
import {useMessageDraft} from './use-message-draft';

type Store = ReturnType<typeof useMessageDraft>;

export function Composer() {
  const store = useMessageDraft();
  const [sent, setSent] = useState(false);
  const {scrollToEnd} = useMessageScroller();
  const [discard, setDiscard] = useState(false);
  const draftId = store.draft?.id;
  useEffect(() => {
    if (sent && draftId) {
      const frame = requestAnimationFrame(() => scrollToEnd({behavior: 'auto'}));
      return () => cancelAnimationFrame(frame);
    }
  }, [sent, draftId, scrollToEnd]);
  if (!store.draft) {
    return (
      <div className="p-4 space-y-3">
        {store.loadError ? (
          <>
            <FormError message={store.loadError} />
            <Button
              variant="outline"
              onPress={() => window.location.reload()}
            >
              Try again
            </Button>
            <Button
              variant="ghost"
              onPress={() => setDiscard(true)}
            >
              Discard unreadable draft
            </Button>
            {discard && (
              <Confirm
                title="Discard this draft?"
                action="Discard draft"
                pending={store.state === 'saving'}
                onClose={() => setDiscard(false)}
                onConfirm={() => {
                  store.reset();
                }}
              >
                Check the conversation first if you were sending. Sent messages stay in your history.
              </Confirm>
            )}
          </>
        ) : (
          <p role="status">Opening your message draft…</p>
        )}
      </div>
    );
  }
  return (
    <>
      {sent && (
        <p
          role="status"
          className="shrink-0 px-5 py-1 text-sm text-muted-foreground"
        >
          Message sent.
        </p>
      )}
      <MessageComposer
        key={store.draft.id}
        store={store}
        onSent={() => setSent(true)}
      />
    </>
  );
}

function MessageComposer({store, onSent}: {store: Store; onSent: () => void}) {
  const form = useForm({defaultValues: {body: store.draft?.body ?? ''}});
  const body = useWatch({control: form.control, name: 'body'});
  const mutation = useSendMessage();
  const online = useOnline();
  const [busy, setBusy] = useState(false);
  const working = useRef(false);
  const [error, setError] = useState('');
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const [discard, setDiscard] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const photos = useRef<HTMLInputElement>(null);
  const draft = store.draft;
  const locked = Boolean(draft?.attempt) || busy;
  const conflict = mutation.error instanceof ApiError && mutation.error.status === 409;
  const draftId = draft?.id;
  const sessionId = store.session?.id;

  useEffect(() => {
    const current = store.current.current;
    if (current && !current.attempt && current.body !== body) {
      store.update({...current, body});
      setError('');
    }
  }, [body, store]);
  useEffect(() => {
    if (!draftId || !sessionId) {
      return;
    }
    const resource = `${messageResource(draftId)}.picker-error`;
    readDraft(sessionId, resource)
      .then((message) => {
        if (typeof message === 'string' && getSession()?.id === sessionId) {
          setError(message);
          removeDraft(sessionId, resource);
        }
      })
      .catch(() => undefined);
  }, [draftId, sessionId]);

  async function work(action: () => Promise<void>) {
    if (working.current || !store.isCurrent()) {
      return;
    }
    working.current = true;
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (error) {
      if (store.isCurrent()) {
        setError(error instanceof Error ? error.message : 'The message could not be prepared. Please try again.');
      }
    } finally {
      working.current = false;
      setBusy(false);
    }
  }
  async function keep(photo: StoredPhoto) {
    const current = store.current.current;
    if (!current || !store.isCurrent()) {
      return;
    }
    store.setMedia((rows) => [...rows.filter((row) => row.id !== photo.id), photo]);
    if (!(await store.update({...current, mediaIds: [...current.mediaIds, photo.id]}))) {
      throw new Error('The attachment is stored, but this draft could not update. Reopen Messages before sending.');
    }
    setAttachmentsOpen(true);
  }
  function add(file: File) {
    work(async () => {
      const current = store.current.current;
      if (!current || !store.session?.accountId || current.attempt || current.mediaIds.length >= 4) {
        return;
      }
      validateAttachment(file);
      if (!(await store.update(current, true))) {
        throw new Error('This device could not save your draft. Try again before choosing an attachment.');
      }
      const photo = {
        id: crypto.randomUUID(),
        owner: store.session.accountId,
        resource: messageResource(current.id),
        blob: file,
        name: file.name,
      };
      await savePhoto(photo, store.isCurrent);
      await keep(photo);
    });
  }
  function pick(source: 'camera' | 'gallery') {
    work(async () => {
      const current = store.current.current;
      if (!current || current.attempt || current.mediaIds.length >= 4) {
        return;
      }
      if (!(await store.update(current, true))) {
        throw new Error('This device could not save your draft. Try again before choosing a photo.');
      }
      const photo = await pickNativePhoto(source, messageResource(current.id), 'message');
      if (photo) {
        await keep(photo);
      }
    });
  }
  function remove(id: string) {
    work(async () => {
      const current = store.current.current;
      if (!current || current.attempt) {
        return;
      }
      await removePhoto(id);
      if (!store.isCurrent()) {
        return;
      }
      store.setMedia((rows) => rows.filter((row) => row.id !== id));
      await store.update({...current, mediaIds: current.mediaIds.filter((value) => value !== id)}, true);
    });
  }
  function send() {
    work(async () => {
      const current = store.current.current;
      if (!current || !store.session || !online) {
        return;
      }
      let attempt = current.attempt;
      if (!attempt) {
        if (!body.trim() && current.mediaIds.length === 0) {
          form.setError('body', {message: 'Write a message or add an attachment.'}, {shouldFocus: true});
          return;
        }
        const next = {...current, body};
        if (!(await store.update(next, true))) {
          throw new Error('Your message could not be saved on this device. Nothing was sent. Try again.');
        }
        const uploadedIds: string[] = [];
        for (const id of next.mediaIds) {
          const photo = store.media.find((row) => row.id === id);
          if (!photo) {
            throw new Error('An attachment is missing from this device. Remove it and choose the file again.');
          }
          const uploaded = await uploadAttachment(photo, store.session.id);
          if (!store.isCurrent()) {
            return;
          }
          store.setMedia((rows) => rows.map((row) => (row.id === id ? uploaded : row)));
          if (!uploaded.attachmentId) {
            throw new Error('The attachment upload has not finished. Try sending again.');
          }
          uploadedIds.push(uploaded.attachmentId);
        }
        attempt = messageAttempt(next, uploadedIds);
        if (!(await store.update({...next, attempt}, true))) {
          throw new Error('Your send could not be saved on this device. Nothing was sent. Try again.');
        }
      }
      try {
        await mutation.mutateAsync(attempt);
        onSent();
      } catch (error) {
        if (error instanceof ApiError && [404, 422].includes(error.status)) {
          const saved = store.current.current;
          if (saved) {
            await store.update({...saved, attempt: null}, true);
          }
          throw new Error('The message was not accepted. Check your text and attachments, then try again.');
        }
        throw new Error(
          error instanceof ApiError && error.status === 409
            ? 'An earlier version of this message was already sent. Check the conversation, then discard this conflicting draft to write a new message.'
            : 'Delivery could not be confirmed. Retry safely to check or send this message once.',
        );
      }
      if (!(await store.reset())) {
        throw new Error('Your message was sent, but this device could not clear its draft. Retry safely to finish.');
      }
    });
  }
  if (!draft) {
    return null;
  }
  return (
    <form
      className="message-composer space-y-3 border-t border-border bg-surface px-5 py-3"
      onSubmit={form.handleSubmit(send)}
      noValidate
    >
      <FormField
        control={form.control}
        name="body"
        label="Message your coach"
        multiline
        maxLength={4000}
        isDisabled={locked}
      />
      {draft.mediaIds.length > 0 && (
        <div
          className="space-y-2"
          aria-label="Message attachments"
          role="group"
        >
          {draft.mediaIds.map((id, index) => {
            const photo = store.media.find((row) => row.id === id);
            return (
              <div
                key={id}
                className="flex min-w-0 items-center justify-between gap-2 text-sm"
              >
                {photo?.blob.type.startsWith('image/') && (
                  <AttachmentPreview
                    blob={photo.blob}
                    label={`Attachment ${index + 1}`}
                  />
                )}
                <span className="min-w-0 break-words">
                  {photo?.name ?? 'Missing attachment'}
                  {photo?.attachmentId ? ' · Uploaded' : ' · On this device'}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  isDisabled={locked}
                  onPress={() => remove(id)}
                  aria-label={`Remove attachment ${index + 1}`}
                >
                  Remove
                </Button>
              </div>
            );
          })}
        </div>
      )}
      {attachmentsOpen && !draft.attempt && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Up to 4 attachments: photos 15 MB, video 50 MB, audio 10 MB. Uploads start when you send.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              isDisabled={locked || draft.mediaIds.length >= 4}
              onPress={() => (isNative ? pick('gallery') : photos.current?.click())}
            >
              Choose photo
            </Button>
            {isNative && (
              <Button
                variant="outline"
                size="sm"
                isDisabled={locked || draft.mediaIds.length >= 4}
                onPress={() => pick('camera')}
              >
                Take photo
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              isDisabled={locked || draft.mediaIds.length >= 4}
              onPress={() => input.current?.click()}
            >
              Video or audio
            </Button>
          </div>
        </div>
      )}
      <input
        ref={photos}
        className="sr-only"
        tabIndex={-1}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        aria-label="Choose message photo"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) {
            add(file);
          }
        }}
      />
      <input
        ref={input}
        className="sr-only"
        tabIndex={-1}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,audio/webm,audio/mp4,audio/mpeg"
        aria-label="Choose message video or audio"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) {
            add(file);
          }
        }}
      />
      {draft.attempt ? (
        <p
          role="status"
          className="text-sm text-muted-foreground"
        >
          This message is kept until delivery is confirmed. Retrying cannot send a duplicate.
        </p>
      ) : (
        (body || draft.mediaIds.length > 0) && <DraftStatus state={store.state} />
      )}
      {!online && <p className="text-sm text-muted-foreground">Reconnect to send. Nothing sends automatically.</p>}
      <FormError message={error} />
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          isDisabled={locked}
          aria-expanded={attachmentsOpen}
          onPress={() => setAttachmentsOpen((open) => !open)}
        >
          {attachmentsOpen ? 'Close attachments' : 'Attach'}
        </Button>
        {(body || draft.mediaIds.length > 0) && (!draft.attempt || conflict) && (
          <Button
            variant="ghost"
            size="sm"
            isDisabled={busy}
            onPress={() => setDiscard(true)}
          >
            {conflict ? 'Discard conflicting draft' : 'Discard'}
          </Button>
        )}
        <Button
          type="submit"
          isPending={busy}
          isDisabled={!online || busy}
        >
          {draft.attempt ? 'Retry send' : 'Send'}
        </Button>
      </div>
      {discard && (
        <Confirm
          title="Discard this message?"
          action="Discard draft"
          pending={busy}
          onClose={() => setDiscard(false)}
          onConfirm={() =>
            work(async () => {
              if (!(await store.reset())) {
                throw new Error('The draft could not be cleared. Please try again.');
              }
            })
          }
        >
          Your unsent text and attachments will be removed from this device.
        </Confirm>
      )}
    </form>
  );
}

function AttachmentPreview({blob, label}: {blob: Blob; label: string}) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const value = URL.createObjectURL(blob);
    setUrl(value);
    return () => URL.revokeObjectURL(value);
  }, [blob]);
  return url ? (
    <img
      src={url}
      alt={label}
      className="size-14 shrink-0 rounded-lg object-cover"
    />
  ) : null;
}

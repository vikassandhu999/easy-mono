import {Mic, Paperclip, X} from 'lucide-react';
import {useCallback, useEffect, useRef, useState} from 'react';
import {useBeforeUnload, useBlocker} from 'react-router-dom';
import {useProfile} from '../api/auth';
import {uploadContentType, useUploadChatAttachment} from '../api/chat-uploads';
import {ApiError, errorMessage} from '../api/client';
import {type Conversation, useConversationAction, useMessages} from '../api/conversations';
import {getSession} from '../api/session';
import {Button} from '../ui/button';
import {Dialog, DialogHeader, DialogTitle} from '../ui/dialog';
import {FormError} from '../ui/form-error';
import {useMessageScroller} from '../ui/message-scroller';
import {Textarea} from '../ui/textarea';
import {type ConversationDraft, draftKey, emptyDraft, loadDraft, saveDraft} from './draft';
import {VoiceNote} from './voice-note';

type Upload = {key: string; file: File; state: 'uploading' | 'error'; message: string};
export function MessageComposer({conversation}: {conversation: Conversation}) {
  const key = draftKey(getSession()?.id ?? '', conversation.id);
  const [loaded, setLoaded] = useState(() => loadDraft(key));
  const [draft, setDraft] = useState(() => (loaded.kind === 'ready' ? loaded.draft : emptyDraft()));
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [stored, setStored] = useState(true);
  const send = useConversationAction(conversation.id);
  const upload = useUploadChatAttachment(conversation.client_id);
  const messages = useMessages(conversation.id);
  const profile = useProfile();
  const {scrollToEnd} = useMessageScroller();
  const input = useRef<HTMLInputElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const mounted = useRef(true);
  const pending = send.isPending || upload.isPending;
  const dirty = Boolean(draft.body || draft.attachments.length);
  const latestHistory = messages.data?.pages[0]?.latest_message_at ?? null;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (loaded.kind === 'ready') {
      setStored(saveDraft(key, draft));
    }
  }, [key, draft, loaded.kind]);
  const blocker = useBlocker(
    ({currentLocation, nextLocation}) =>
      (pending || voiceOpen || (!stored && dirty)) && currentLocation.pathname !== nextLocation.pathname,
  );
  useBeforeUnload(
    useCallback(
      (event) => {
        if (pending || voiceOpen || (!stored && dirty)) {
          event.preventDefault();
          event.returnValue = '';
        }
      },
      [pending, voiceOpen, stored, dirty],
    ),
  );
  const teammateReply =
    profile.data &&
    dirty &&
    draft.teammateThrough !== undefined &&
    messages.data?.pages[0]?.data.some(
      (message) =>
        message.sender_type === 'coach' &&
        message.sender_id !== profile.data?.data.id &&
        (draft.teammateThrough === null || message.inserted_at > (draft.teammateThrough ?? '')),
    );
  function edit(patch: Partial<ConversationDraft>) {
    setDraft((previous) => ({
      ...previous,
      ...patch,
      teammateThrough: previous.teammateThrough === undefined ? latestHistory : previous.teammateThrough,
    }));
    setError('');
    setNotice('');
  }
  async function attach(file: File, fileKey: string = crypto.randomUUID()) {
    if (!uploadContentType(file.type)) {
      setError('Choose a JPEG, PNG, WebP, HEIC, MP4, WebM, MOV or MP3 file.');
      return;
    }
    if (draft.attachments.length >= 4 && !draft.attachments.some((item) => item.key === fileKey)) {
      setError('You can attach up to four files.');
      return;
    }
    setError('');
    setDraft((previous) => ({
      ...previous,
      teammateThrough: previous.teammateThrough === undefined ? latestHistory : previous.teammateThrough,
      attachments: previous.attachments.some((item) => item.key === fileKey)
        ? previous.attachments
        : [...previous.attachments, {key: fileKey, name: file.name, id: null}],
    }));
    setUploads((previous) => [
      ...previous.filter((item) => item.key !== fileKey),
      {key: fileKey, file, state: 'uploading', message: ''},
    ]);
    try {
      const result = await upload.mutateAsync(file);
      if (!mounted.current) {
        return;
      }
      setDraft((previous) => ({
        ...previous,
        attachments: previous.attachments.map((item) => (item.key === fileKey ? {...item, id: result.id} : item)),
      }));
      setUploads((previous) => previous.filter((item) => item.key !== fileKey));
    } catch (error) {
      if (mounted.current) {
        setUploads((previous) =>
          previous.map((item) =>
            item.key === fileKey
              ? {...item, state: 'error', message: errorMessage(error, 'Upload failed. Try again.')}
              : item,
          ),
        );
      }
    }
  }
  async function submit() {
    if (loaded.kind === 'failed') {
      return;
    }
    if (pending || !messages.data) {
      return;
    }
    if (!draft.body.trim() && !draft.attachments.length) {
      setError('Write a message or attach a file.');
      textarea.current?.focus();
      return;
    }
    if (draft.attachments.some((file) => !file.id)) {
      setError('Finish uploading or remove the unavailable attachment before sending.');
      return;
    }
    setError('');
    setNotice('');
    const sending = {
      ...draft,
      state: 'uncertain' as const,
    };
    // Persist the exact retry identity before the request can reach the server.
    if (!saveDraft(key, sending)) {
      setError('This device could not save your send recovery. Free browser storage and try again.');
      return;
    }
    setDraft(sending);
    try {
      await send.mutateAsync({
        kind: 'send',
        body: {
          body: sending.body.trim() || null,
          request_id: sending.requestId,
          attachment_ids: sending.attachments.flatMap((item) => (item.id ? [item.id] : [])),
        },
      });
      const cleared = emptyDraft();
      saveDraft(key, cleared);
      if (!mounted.current) {
        return;
      }
      setDraft(cleared);
      setUploads([]);
      setNotice('Message sent.');
      scrollToEnd();
      textarea.current?.focus({preventScroll: true});
    } catch (error) {
      if (!mounted.current) {
        return;
      }
      if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
        setDraft((previous) => ({...previous, state: 'editing'}));
        setError(errorMessage(error, 'Could not send the message.'));
      }
    }
  }
  if (loaded.kind === 'failed') {
    return (
      <section
        aria-label="Draft recovery"
        className="shrink-0 space-y-3 rounded-2xl border border-border bg-surface p-4"
      >
        <FormError message="Your saved draft could not be read. It has been kept unchanged, including any send retry information." />
        <p className="text-sm text-muted-foreground">
          Retry recovery to continue. Before discarding, check the conversation: a previous send may have succeeded.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            onPress={() => {
              const recovered = loadDraft(key);
              if (recovered.kind === 'ready') {
                setDraft(recovered.draft);
              }
              setLoaded(recovered);
            }}
          >
            Retry draft recovery
          </Button>
          <Button
            variant="ghost"
            onPress={() => {
              const cleared = emptyDraft();
              if (saveDraft(key, cleared)) {
                setDraft(cleared);
                setLoaded({kind: 'ready', draft: cleared});
              } else {
                setStored(false);
              }
            }}
          >
            Discard saved draft
          </Button>
        </div>
      </section>
    );
  }
  return (
    <>
      <form
        className="max-h-[48dvh] shrink-0 space-y-3 overflow-y-auto rounded-2xl border border-border bg-surface p-3 sm:p-4"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        {teammateReply && (
          <p
            role="status"
            className="rounded-xl bg-muted p-3 text-sm"
          >
            A teammate replied while you were composing. Your draft is saved. Read their message before sending.
          </p>
        )}
        <label
          htmlFor="message-body"
          className="block text-sm font-medium"
        >
          Message {conversation.client_name || 'client'}
        </label>
        <Textarea
          id="message-body"
          ref={textarea}
          value={draft.body}
          maxLength={4000}
          disabled={pending || !messages.data || draft.state === 'uncertain'}
          onChange={(event) => edit({body: event.target.value})}
          placeholder="Write your message…"
          className="min-h-16 max-h-40"
        />
        {draft.attachments.map((file) => {
          const progress = uploads.find((item) => item.key === file.key);
          return (
            <div
              key={file.key}
              role="group"
              aria-label={file.name}
              className="rounded-xl border border-border p-3 text-sm"
            >
              <div className="flex items-center gap-2">
                <p className="min-w-0 flex-1 break-all">{file.name}</p>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove ${file.name}`}
                  isDisabled={pending || draft.state === 'uncertain'}
                  onPress={() => edit({attachments: draft.attachments.filter((item) => item.key !== file.key)})}
                >
                  <X aria-hidden="true" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {file.id
                  ? 'Ready to send'
                  : progress?.state === 'uploading'
                    ? 'Uploading…'
                    : progress
                      ? progress.message
                      : 'Upload was interrupted. Remove this file and attach it again.'}
              </p>
              {progress?.state === 'error' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={() => {
                    attach(progress.file, file.key);
                  }}
                >
                  Retry upload
                </Button>
              )}
            </div>
          );
        })}
        {error && <FormError message={error} />}
        {!stored && (
          <FormError message="Draft could not be saved on this device. Keep this page open until storage is available." />
        )}
        {draft.state === 'uncertain' && !send.isPending && (
          <div
            role="alert"
            className="space-y-2"
          >
            <p className="text-sm">
              We couldn’t confirm the send. Your message is saved. Retry safely; an accepted message will not be sent
              twice.
            </p>
            <Button
              onPress={() => {
                submit();
              }}
              isDisabled={pending || !messages.data}
              isPending={send.isPending}
            >
              Retry send
            </Button>
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <input
              ref={input}
              type="file"
              className="sr-only"
              tabIndex={-1}
              aria-label="Attach a file"
              accept="image/jpeg,image/png,image/webp,image/heic,video/mp4,video/webm,video/quicktime,audio/webm,audio/mp4,audio/mpeg"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file) {
                  attach(file);
                }
              }}
            />
            <Button
              variant="ghost"
              aria-label="Attach file"
              isDisabled={pending || !messages.data || draft.attachments.length >= 4 || draft.state === 'uncertain'}
              onPress={() => input.current?.click()}
            >
              <Paperclip aria-hidden="true" />
              <span className="sr-only sm:not-sr-only">Attach file</span>
            </Button>
            <Button
              variant="ghost"
              aria-label="Record voice note"
              isDisabled={pending || !messages.data || draft.attachments.length >= 4 || draft.state === 'uncertain'}
              onPress={() => setVoiceOpen(true)}
            >
              <Mic aria-hidden="true" />
              <span className="sr-only sm:not-sr-only">Voice note</span>
            </Button>
          </div>
          <Button
            type="submit"
            isDisabled={upload.isPending || !messages.data || draft.state === 'uncertain'}
            isPending={send.isPending}
          >
            {send.isPaused ? 'Waiting for connection…' : 'Send message'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {stored ? 'Draft saved on this device.' : 'Draft has not been saved on this device.'} Up to 4 files.
          Unfinished uploads need to be attached again after reopening.
        </p>
        {notice && (
          <p
            role="status"
            className="text-sm"
          >
            {notice}
          </p>
        )}
      </form>
      <Dialog
        isOpen={voiceOpen}
        onOpenChange={setVoiceOpen}
        isDismissable={false}
      >
        {voiceOpen && (
          <VoiceNote
            onAttach={(file) => {
              setVoiceOpen(false);
              attach(file);
            }}
          />
        )}
      </Dialog>
      <Dialog
        isOpen={blocker.state === 'blocked'}
        onOpenChange={(open) => {
          if (!open && blocker.state === 'blocked') {
            blocker.reset();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Keep this page open</DialogTitle>
        </DialogHeader>
        <div className="dialog-body space-y-4">
          <p>
            {pending
              ? 'Wait for the send or upload to finish. Your message text is saved on this device.'
              : voiceOpen
                ? 'Finish or cancel the voice recording first.'
                : 'Your draft could not be saved on this device. Stay here to preserve it.'}
          </p>
          <Button
            onPress={() => {
              if (blocker.state === 'blocked') {
                blocker.reset();
              }
            }}
          >
            Keep writing
          </Button>
        </div>
      </Dialog>
    </>
  );
}

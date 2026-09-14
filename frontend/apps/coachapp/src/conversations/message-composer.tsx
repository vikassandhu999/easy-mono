import {Mic, Paperclip, X} from 'lucide-react';
import {useCallback, useEffect, useRef, useState} from 'react';
import {useBeforeUnload, useBlocker, useLocation, useSearchParams} from 'react-router-dom';
import {uploadContentType, useUploadChatAttachment} from '../api/chat-uploads';
import {ApiError, errorMessage} from '../api/client';
import {type Conversation, useConversationAction, useMessages} from '../api/conversations';
import {useFormSubmission} from '../api/forms';
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentTitle,
} from '../ui/attachment';
import {Button} from '../ui/button';
import {Dialog, DialogHeader, DialogTitle} from '../ui/dialog';
import {FormError} from '../ui/form-error';
import {useMessageScroller} from '../ui/message-scroller';
import {Textarea} from '../ui/textarea';
import {SharedResponse} from './shared-response';
import {VoiceNote} from './voice-note';

type DraftAttachment = {key: string; file: File} & (
  | {state: 'uploading'}
  | {state: 'error'; message: string}
  | {state: 'done'; id: string}
);
export function MessageComposer({conversation}: {conversation: Conversation}) {
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const responseId = params.get('response');
  const shared = useFormSubmission(conversation.client_id, responseId);
  function removeResponse() {
    if (!responseId) {
      return;
    }
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        next.delete('response');
        return next;
      },
      {replace: true, state: location.state},
    );
  }
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<DraftAttachment[]>([]);
  const [error, setError] = useState('');
  const [recovery, setRecovery] = useState<'editing' | 'uncertain' | 'checked'>('editing');
  const [notice, setNotice] = useState('');
  const send = useConversationAction(conversation.id);
  const upload = useUploadChatAttachment(conversation.client_id);
  const messages = useMessages(conversation.id);
  const {scrollToEnd} = useMessageScroller();
  const input = useRef<HTMLInputElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const pending = send.isPending || upload.isPending;
  const dirty = body.length > 0 || files.length > 0 || voiceOpen || Boolean(responseId);
  const blocker = useBlocker(
    ({currentLocation, nextLocation}) => (dirty || pending) && currentLocation.pathname !== nextLocation.pathname,
  );
  useBeforeUnload(
    useCallback(
      (event) => {
        if (dirty || pending) {
          event.preventDefault();
          event.returnValue = '';
        }
      },
      [dirty, pending],
    ),
  );

  async function attach(file: File, key: string = crypto.randomUUID()) {
    if (!uploadContentType(file.type)) {
      setError('Choose a JPEG, PNG, WebP, HEIC, MP4, WebM, MOV or MP3 file.');
      return;
    }
    if (files.length >= 4 && !files.some((item) => item.key === key)) {
      setError('You can attach up to four files.');
      return;
    }
    setError('');
    setFiles((previous) =>
      previous.some((item) => item.key === key)
        ? previous.map((item) => (item.key === key ? {key, file, state: 'uploading'} : item))
        : [...previous, {key, file, state: 'uploading'}],
    );
    try {
      const result = await upload.mutateAsync(file);
      if (mounted.current) {
        setFiles((previous) =>
          previous.map((item) => (item.key === key ? {key, file, state: 'done', id: result.id} : item)),
        );
      }
    } catch (error) {
      if (mounted.current) {
        setFiles((previous) =>
          previous.map((item) =>
            item.key === key
              ? {key, file, state: 'error', message: errorMessage(error, 'Upload failed. Please try again.')}
              : item,
          ),
        );
      }
    }
  }
  async function submit() {
    if (pending || recovery === 'uncertain') {
      return;
    }
    if (!body.trim() && files.length === 0 && !responseId) {
      setError('Write a message or attach a file.');
      textarea.current?.focus();
      return;
    }
    if (responseId && (!shared.data || shared.isError)) {
      setError('Wait for the shared response to load, retry it, or remove it before sending.');
      return;
    }
    if (files.some((file) => file.state !== 'done')) {
      setError('Finish uploading or remove the failed attachment before sending.');
      return;
    }
    setError('');
    setNotice('');
    try {
      await send.mutateAsync({
        kind: 'send',
        body: {
          body: body.trim() || null,
          ...(responseId && shared.data ? {embed: {type: 'form_submission', id: shared.data.data.id}} : {}),
          attachment_ids: files.flatMap((file) => (file.state === 'done' ? [file.id] : [])),
        },
      });
      if (!mounted.current) {
        return;
      }
      setBody('');
      setFiles([]);
      removeResponse();
      setRecovery('editing');
      setNotice('Message sent.');
      scrollToEnd();
      textarea.current?.focus({preventScroll: true});
    } catch (error) {
      if (!mounted.current) {
        return;
      }
      if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
        setError(errorMessage(error, 'Could not send the message.'));
      } else {
        setRecovery('uncertain');
      }
    }
  }
  return (
    <>
      <form
        className="max-h-[45dvh] shrink-0 space-y-3 overflow-y-auto rounded-2xl border border-border bg-surface p-3 sm:p-4"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <label
          htmlFor="message-body"
          className="block text-sm font-medium"
        >
          Message {conversation.client_name || 'client'}
        </label>
        <Textarea
          id="message-body"
          ref={textarea}
          value={body}
          maxLength={4000}
          disabled={pending || recovery !== 'editing'}
          onChange={(event) => {
            setBody(event.target.value);
            setError('');
            setNotice('');
          }}
          placeholder="Write your message…"
          className="min-h-16 max-h-40"
        />
        {responseId && (
          <div
            className="flex items-start gap-2 rounded-xl bg-muted p-2"
            role="group"
            aria-label="Attached form response"
          >
            <div className="min-w-0 flex-1 space-y-2">
              {shared.data ? (
                <SharedResponse
                  clientId={conversation.client_id}
                  id={shared.data.data.id}
                  title={shared.data.data.form_assignment.form_template.name}
                />
              ) : shared.isPending ? (
                <p
                  role="status"
                  className="p-2 text-sm"
                >
                  Loading shared response…
                </p>
              ) : (
                <FormError message="Could not load the shared response. Retry or remove it to continue." />
              )}
              {shared.isError && (
                <Button
                  variant="outline"
                  onPress={() => {
                    shared.refetch();
                  }}
                >
                  Retry shared response
                </Button>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Remove shared response"
              isDisabled={pending || recovery !== 'editing'}
              onPress={removeResponse}
            >
              <X aria-hidden="true" />
            </Button>
          </div>
        )}
        {files.length > 0 && (
          <div
            role="group"
            aria-label="Message attachments"
            className="flex flex-wrap gap-3"
          >
            {files.map((file) => (
              <Attachment
                key={file.key}
                state={file.state}
                className="w-full sm:w-auto sm:max-w-80"
              >
                <AttachmentContent>
                  <AttachmentTitle title={file.file.name}>{file.file.name}</AttachmentTitle>
                  <AttachmentDescription>
                    {file.state === 'done'
                      ? 'Ready to send'
                      : file.state === 'uploading'
                        ? 'Uploading…'
                        : 'Upload failed'}
                  </AttachmentDescription>
                  {file.state === 'error' && <p className="text-xs text-muted-foreground">{file.message}</p>}
                </AttachmentContent>
                <AttachmentActions>
                  {file.state === 'error' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      isDisabled={pending || recovery !== 'editing'}
                      onPress={() => {
                        attach(file.file, file.key);
                      }}
                    >
                      Retry upload
                    </Button>
                  )}
                  <AttachmentAction
                    aria-label={`Remove ${file.file.name}`}
                    isDisabled={pending || recovery !== 'editing'}
                    onPress={() => setFiles((previous) => previous.filter((item) => item.key !== file.key))}
                  >
                    <X aria-hidden="true" />
                  </AttachmentAction>
                </AttachmentActions>
              </Attachment>
            ))}
          </div>
        )}
        {error && <FormError message={error} />}
        {recovery !== 'editing' && (
          <div
            className="space-y-3"
            role="alert"
          >
            <p className="text-sm">
              We couldn't confirm the send. Your draft is here. Check the latest messages before sending it again.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                isPending={messages.isFetching}
                onPress={async () => {
                  const result = await messages.refetch();
                  if (!mounted.current) {
                    return;
                  }
                  if (result.isError) {
                    setError('Could not check recent messages. Try again.');
                    return;
                  }
                  setError('');
                  setRecovery('checked');
                  scrollToEnd();
                }}
              >
                Check latest messages
              </Button>
              {recovery === 'checked' && (
                <>
                  <Button
                    variant="outline"
                    onPress={() => {
                      setBody('');
                      setFiles([]);
                      removeResponse();
                      setRecovery('editing');
                      setNotice('Draft cleared.');
                    }}
                  >
                    Already sent · clear draft
                  </Button>
                  <Button
                    onPress={() => {
                      submit();
                    }}
                    isPending={send.isPending}
                  >
                    Send again
                  </Button>
                </>
              )}
            </div>
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
              isDisabled={pending || files.length >= 4 || recovery !== 'editing'}
              onPress={() => input.current?.click()}
            >
              <Paperclip aria-hidden="true" />
              <span className="sr-only sm:not-sr-only">Attach file</span>
            </Button>
            <Button
              variant="ghost"
              aria-label="Record voice note"
              isDisabled={pending || files.length >= 4 || recovery !== 'editing'}
              onPress={() => setVoiceOpen(true)}
            >
              <Mic aria-hidden="true" />
              <span className="sr-only sm:not-sr-only">Voice note</span>
            </Button>
          </div>
          <Button
            type="submit"
            isDisabled={
              upload.isPending || recovery !== 'editing' || Boolean(responseId && (!shared.data || shared.isError))
            }
            isPending={send.isPending}
          >
            {send.isPaused ? 'Waiting for connection…' : 'Send message'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Up to 4 files. Photos up to 15 MB, videos 50 MB, audio 10 MB. Enter starts a new line.
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
          <DialogTitle>Leave this conversation?</DialogTitle>
        </DialogHeader>
        <div className="dialog-body space-y-4">
          <p>Your unsent message and attachments will be discarded.</p>
          <div className="flex flex-wrap gap-3">
            <Button
              autoFocus
              onPress={() => {
                if (blocker.state === 'blocked') {
                  blocker.reset();
                }
              }}
            >
              Keep writing
            </Button>
            <Button
              variant="outline"
              isDisabled={pending}
              onPress={() => {
                if (blocker.state === 'blocked') {
                  blocker.proceed();
                }
              }}
            >
              Discard draft
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

import {useEffect, useRef, useState} from 'react';
import {readDraft, writeDraft} from '../api/drafts';
import {clearResourcePhotos, readPhotos, type StoredPhoto} from '../api/photo-store';
import {getSession} from '../api/session';
import {emptyMessageDraft, type MessageDraft, messageResource, parseMessageDraft} from './message-draft';

export function useMessageDraft() {
  const [session] = useState(getSession);
  const [draft, setDraft] = useState<MessageDraft | null>(null);
  const [media, setMedia] = useState<StoredPhoto[]>([]);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [loadError, setLoadError] = useState('');
  const current = useRef<MessageDraft | null>(null);
  const sequence = useRef(0);
  const mounted = useRef(true);
  const isCurrent = () => !!session && getSession()?.id === session.id;

  // biome-ignore lint/correctness/useExhaustiveDependencies: AppShell remounts this account-owned controller on session change.
  useEffect(() => {
    mounted.current = true;
    if (!session?.accountId) {
      return;
    }
    async function restore() {
      if (!session?.accountId) {
        return;
      }
      try {
        const raw = await readDraft(session.id, 'message');
        const saved = raw === null ? emptyMessageDraft() : parseMessageDraft(raw);
        if (!saved) {
          throw new Error('This message draft could not be read. Your sent messages are still in the conversation.');
        }
        const photos = await readPhotos(session.accountId, messageResource(saved.id));
        const restored = saved.attempt
          ? saved
          : {...saved, mediaIds: [...new Set([...saved.mediaIds, ...photos.map((photo) => photo.id)])]};
        if (restored.mediaIds.length > 4) {
          throw new Error('This message draft has too many attachments. Your sent messages are still available.');
        }
        if (!mounted.current || !isCurrent()) {
          return;
        }
        current.current = restored;
        setMedia(photos);
        if (!(await update(restored, true)) && mounted.current && isCurrent()) {
          setDraft(restored);
        }
      } catch (error) {
        if (mounted.current && isCurrent()) {
          setLoadError(
            error instanceof Error
              ? error.message
              : 'Your message draft could not be opened. Reopen Messages to retry.',
          );
        }
      }
    }
    restore();
    return () => {
      mounted.current = false;
    };
  }, []);

  async function update(next: MessageDraft, durable = false) {
    if (!session || !isCurrent()) {
      return false;
    }
    if (!durable) {
      current.current = next;
      setDraft(next);
    }
    const write = ++sequence.current;
    setState('saving');
    try {
      await writeDraft(session.id, 'message', next);
      if (!isCurrent() || (durable && write !== sequence.current)) {
        return false;
      }
      if (durable) {
        current.current = next;
        if (mounted.current) {
          setDraft(next);
        }
      }
      if (mounted.current && write === sequence.current) {
        setState('saved');
        setLoadError('');
      }
      return true;
    } catch {
      if (mounted.current && write === sequence.current) {
        setState('error');
      }
      return false;
    }
  }
  async function reset() {
    const previous = current.current;
    if (!(await update(emptyMessageDraft(), true))) {
      return false;
    }
    setMedia([]);
    if (session?.accountId && previous) {
      await clearResourcePhotos(session.accountId, messageResource(previous.id)).catch(() => undefined);
    }
    return true;
  }
  return {draft, media, setMedia, state, loadError, update, reset, session, isCurrent, current};
}

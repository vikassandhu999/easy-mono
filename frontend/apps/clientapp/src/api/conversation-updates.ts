import {focusManager, onlineManager} from '@tanstack/react-query';
import {Socket} from 'phoenix';
import {useEffect, useState} from 'react';
import {refreshSession} from './client';
import {conversationKeys} from './keys';
import {queryClient} from './query-client';
import {getSession, subscribeSession} from './session';

export function useConversationUpdates(conversationId: string | undefined) {
  const [status, setStatus] = useState<'connecting' | 'live' | 'reconnecting'>('connecting');
  useEffect(() => {
    if (!conversationId) {
      return;
    }
    const owner = getSession()?.id;
    let stopped = false;
    let connecting = false;
    let socket: Socket | undefined;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const current = () => !stopped && !!owner && getSession()?.id === owner;
    const available = () => current() && onlineManager.isOnline() && focusManager.isFocused();
    const refresh = () => {
      if (current()) {
        queryClient.invalidateQueries({queryKey: conversationKeys.all});
      }
    };
    function disconnect() {
      const previous = socket;
      socket = undefined;
      previous?.disconnect();
    }
    function reconnect() {
      if (!current()) {
        return;
      }
      setStatus('reconnecting');
      disconnect();
      if (available() && !retry) {
        retry = setTimeout(() => {
          retry = undefined;
          connect();
        }, 5000);
      }
    }
    async function connect() {
      if (!available() || socket || connecting) {
        return;
      }
      connecting = true;
      try {
        const session = await refreshSession();
        if (!available() || !session) {
          return;
        }
        const next = new Socket(new URL('/socket', import.meta.env.VITE_API_BASE_URL || window.location.origin).href, {
          params: () => ({token: getSession()?.tokens.access_token}),
        });
        socket = next;
        const failed = () => {
          if (socket === next) {
            reconnect();
          }
        };
        next.onError(failed);
        next.onClose(failed);
        const channel = next.channel(`conversation:${conversationId}`, {});
        channel.on('message_new', refresh);
        channel.on('message_updated', refresh);
        channel.on('message_deleted', refresh);
        channel.on('conversation_updated', refresh);
        channel.onError(failed);
        channel
          .join()
          .receive('ok', () => {
            if (socket === next && current()) {
              setStatus('live');
              refresh();
            }
          })
          .receive('error', failed)
          .receive('timeout', failed);
        next.connect();
      } catch {
        reconnect();
      } finally {
        connecting = false;
      }
    }
    const lifecycle = () => {
      clearTimeout(retry);
      retry = undefined;
      if (available()) {
        connect();
      } else {
        disconnect();
        setStatus('reconnecting');
      }
    };
    const unsubscribe = [
      onlineManager.subscribe(lifecycle),
      focusManager.subscribe(lifecycle),
      subscribeSession(() => {
        if (!current()) {
          stopped = true;
          clearTimeout(retry);
          disconnect();
        }
      }),
    ];
    connect();
    return () => {
      stopped = true;
      clearTimeout(retry);
      disconnect();
      for (const stop of unsubscribe) {
        stop();
      }
    };
  }, [conversationId]);
  return status;
}

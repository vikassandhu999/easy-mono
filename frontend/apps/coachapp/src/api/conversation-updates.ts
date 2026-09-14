import {Socket} from 'phoenix';
import {useEffect, useState} from 'react';
import {refreshSession} from './client';
import {conversationKeys, workbenchKeys} from './keys';
import {queryClient} from './query-client';
import {getSession, subscribeSession} from './session';

export function useConversationUpdates() {
  const [status, setStatus] = useState<'connecting' | 'live' | 'reconnecting'>('connecting');
  useEffect(() => {
    const sessionId = getSession()?.id;
    let stopped = false;
    let socket: Socket | undefined;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const current = () => !stopped && !!sessionId && getSession()?.id === sessionId;
    const refresh = () => {
      if (current()) {
        queryClient.invalidateQueries({queryKey: conversationKeys.all});
        queryClient.invalidateQueries({queryKey: workbenchKeys.all});
      }
    };
    function reconnect() {
      socket?.disconnect();
      if (!current() || retry) {
        return;
      }
      setStatus('reconnecting');
      retry = setTimeout(() => {
        retry = undefined;
        connect();
      }, 5000);
    }
    async function connect() {
      try {
        const session = await refreshSession();
        if (!current() || !session) {
          return;
        }
        socket = new Socket(new URL('/socket', import.meta.env.VITE_API_BASE_URL || window.location.origin).href, {
          params: () => ({token: getSession()?.tokens.access_token}),
        });
        socket.onError(reconnect);
        socket.onClose(reconnect);
        const channel = socket.channel('inbox', {});
        channel.on('conversation_updated', refresh);
        channel.onError(reconnect);
        channel
          .join()
          .receive('ok', () => {
            if (current()) {
              setStatus('live');
              refresh();
            }
          })
          .receive('error', reconnect)
          .receive('timeout', reconnect);
        socket.connect();
      } catch {
        reconnect();
      }
    }
    function stop() {
      stopped = true;
      clearTimeout(retry);
      socket?.disconnect();
    }
    const unsubscribe = subscribeSession(() => {
      if (getSession()?.id !== sessionId) {
        stop();
      }
    });
    connect();
    return () => {
      stop();
      unsubscribe();
    };
  }, []);
  return status;
}

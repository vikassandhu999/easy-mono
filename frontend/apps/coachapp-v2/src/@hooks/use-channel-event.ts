import {useEffect, useRef} from 'react';

import {getSocket} from '@/api/socket';

/**
 * Join `topic` and invoke `onPayload` for every `event`. Pass a null topic to
 * skip (e.g. while the conversation id is still loading). Only ONE mounted
 * component may join a given topic — phoenix.js rejects duplicate joins.
 */
export function useChannelEvent(topic: string | null, event: string, onPayload: (payload: unknown) => void) {
  const handlerRef = useRef(onPayload);
  handlerRef.current = onPayload;

  useEffect(() => {
    if (!topic) {
      return;
    }
    const channel = getSocket().channel(topic);
    channel.on(event, (payload: unknown) => handlerRef.current(payload));
    channel.join();
    return () => {
      channel.leave();
    };
  }, [topic, event]);
}

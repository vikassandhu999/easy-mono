import {useEffect, useRef} from 'react';

import {getSocket} from '@/api/socket';

/**
 * Join `topic` and invoke `onPayload` for every `event`. Pass a null topic to
 * skip (e.g. while the conversation id is still loading). Only ONE mounted
 * component may join a given topic — phoenix.js rejects duplicate joins.
 *
 * `onJoin` fires on every successful join, including rejoins after a dropped
 * socket — phoenix.js re-fires the joinPush's `ok` on each rejoin. Use it to
 * refetch anything missed while disconnected.
 */
export function useChannelEvent(
  topic: string | null,
  event: string,
  onPayload: (payload: unknown) => void,
  onJoin?: () => void,
) {
  const handlerRef = useRef(onPayload);
  handlerRef.current = onPayload;
  const onJoinRef = useRef(onJoin);
  onJoinRef.current = onJoin;

  useEffect(() => {
    if (!topic) {
      return;
    }
    const channel = getSocket().channel(topic);
    channel.on(event, (payload: unknown) => handlerRef.current(payload));
    channel.join().receive('ok', () => onJoinRef.current?.());
    return () => {
      channel.leave();
    };
  }, [topic, event]);
}

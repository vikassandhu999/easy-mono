import {useDispatch} from 'react-redux';

import {useChannelEvent} from '@/@hooks/use-channel-event';
import {api} from '@/api/base';
import {appendClientMessageAction, type ChatMessage, useGetClientConversationQuery} from '@/api/conversation';

/** Mounted once in AppShell — the single join of the conversation topic. */
export function useChatRealtime() {
  const dispatch = useDispatch();
  const {data} = useGetClientConversationQuery();
  const conversationId = data?.data.id ?? null;

  useChannelEvent(
    conversationId ? `conversation:${conversationId}` : null,
    'message_new',
    (payload) => {
      dispatch(appendClientMessageAction(payload as ChatMessage));
      dispatch(api.util.invalidateTags([{type: 'Conversation', id: 'LIST'}]));
    },
    // Refetch anything missed while the socket was down (fires on every rejoin).
    () =>
      dispatch(
        api.util.invalidateTags([
          {type: 'ChatMessage', id: 'MINE'},
          {type: 'Conversation', id: 'LIST'},
        ]),
      ),
  );
}

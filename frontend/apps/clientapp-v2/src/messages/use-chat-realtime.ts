import {useQueryClient} from '@tanstack/react-query';

import {useChannelEvent} from '@/@hooks/use-channel-event';
import {appendClientMessage, type ChatMessage, useGetClientConversationQuery} from '@/api/conversation';
import {conversationKeys} from '@/api/keys';

/** Mounted once in AppShell — the single join of the conversation topic. */
export function useChatRealtime() {
  const qc = useQueryClient();
  const {data} = useGetClientConversationQuery();
  const conversationId = data?.data.id ?? null;

  useChannelEvent(
    conversationId ? `conversation:${conversationId}` : null,
    'message_new',
    (payload) => {
      appendClientMessage(payload as ChatMessage);
      qc.invalidateQueries({queryKey: conversationKeys.detail()});
    },
    // Refetch anything missed while the socket was down (fires on every rejoin) —
    // history AND header, hence `all` rather than just `detail()`.
    () => qc.invalidateQueries({queryKey: conversationKeys.all}),
  );
}

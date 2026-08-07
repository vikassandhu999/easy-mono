import {ConversationInboxList} from '@/@components/conversation-inbox-list';
import {Page} from '@/@components/page';
import {useListCoachConversationsQuery} from '@/api/conversations';

/**
 * The full-page inbox — the Messages destination on both breakpoints (mobile
 * bottom nav, desktop sidebar).
 */
export default function MessagesInbox() {
  const {data} = useListCoachConversationsQuery();
  const unreadTotal = (data?.data ?? []).reduce((total, conversation) => total + conversation.unread_count, 0);

  return (
    <Page>
      <Page.Header size="content">
        <Page.TitleGroup>
          <Page.Title>Messages</Page.Title>
          <Page.Description>
            {unreadTotal > 0
              ? `${unreadTotal} unread ${unreadTotal === 1 ? 'message' : 'messages'}`
              : 'Your client conversations'}
          </Page.Description>
        </Page.TitleGroup>
      </Page.Header>
      <Page.Content bare>
        <Page.Frame
          className="flex min-h-0 flex-1 flex-col pb-6 pt-2"
          size="content"
        >
          <ConversationInboxList className="flex-1 gap-0 overflow-hidden rounded-card border border-border bg-surface" />
        </Page.Frame>
      </Page.Content>
    </Page>
  );
}

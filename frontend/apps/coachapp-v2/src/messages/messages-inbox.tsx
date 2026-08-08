import {ConversationInboxList} from '@/@components/conversation-inbox-list';
import {Page} from '@/@components/page';
import {useCoachConversationsInfiniteQuery} from '@/api/conversations';

/**
 * The full-page inbox. Not a nav destination since 2026-08-08 (the inbox
 * opens as a modal from the Today card) — this page survives as the Back
 * target of a conversation opened from the inbox.
 */
export default function MessagesInbox() {
  const {data} = useCoachConversationsInfiniteQuery();
  const unreadTotal = (data?.pages ?? [])
    .flatMap((page) => page.data)
    .reduce((total, conversation) => total + conversation.unread_count, 0);

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

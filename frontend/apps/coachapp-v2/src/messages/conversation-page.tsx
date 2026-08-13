import {Spinner, Surface, Typography} from '@heroui/react';
import {useCallback} from 'react';
import {useParams, useSearchParams} from 'react-router-dom';

import {ConversationInboxList} from '@/@components/conversation-inbox-list';
import {ErrorState} from '@/@components/error-state';
import {Page} from '@/@components/page';
import {useGetCoachClientConversationQuery} from '@/api/conversations';
import ConversationView from '@/messages/conversation-view';

export default function ConversationPage() {
  const {id} = useParams<{id: string}>();
  const [searchParams, setSearchParams] = useSearchParams();
  const {data, isError, isLoading, refetch} = useGetCoachClientConversationQuery(id!, {enabled: Boolean(id)});
  const embedId = searchParams.get('embed_id');
  const initialEmbed =
    searchParams.get('embed_type') === 'form_submission' && embedId
      ? ({id: embedId, type: 'form_submission'} as const)
      : null;
  const clearEmbedParams = useCallback(() => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete('embed_type');
        next.delete('embed_id');
        return next;
      },
      {replace: true},
    );
  }, [setSearchParams]);

  if (isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="grid h-dvh place-items-center p-4">
        <ErrorState
          message="Couldn't load this conversation."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <Page.Frame
      className="h-dvh"
      size="content"
    >
      <Surface className="grid h-full overflow-hidden bg-background lg:grid-cols-3 lg:rounded-card lg:border lg:border-border">
        <aside className="hidden min-h-0 flex-col border-r border-border bg-surface lg:flex">
          <div className="shrink-0 border-b border-border p-4">
            <Typography type="h5">Messages</Typography>
            <Typography
              className="mt-1"
              color="muted"
              type="body-sm"
            >
              Recent client conversations
            </Typography>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
            <ConversationInboxList
              activeClientId={id}
              searchable
            />
          </div>
        </aside>
        <ConversationView
          clientId={id!}
          conversationId={data.data.id}
          initialEmbed={initialEmbed}
          key={data.data.id}
          onEmbedSent={clearEmbedParams}
          title={data.data.client_name || 'Client'}
        />
      </Surface>
    </Page.Frame>
  );
}

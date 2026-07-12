import {useParams, useSearchParams} from 'react-router-dom';

import ClientWorkspaceShell, {ClientWorkspaceFallback} from '@/@components/client-workspace-shell';
import {ErrorState} from '@/@components/error-state';
import {PageSkeleton} from '@/@components/page-skeleton';
import {ROUTES} from '@/@config/routes';
import {useGetClientQuery} from '@/api/clients';
import {useGetCoachClientConversationQuery} from '@/api/conversations';
import ConversationView from '@/messages/conversation-view';

export default function ClientConversation() {
  const {id} = useParams<{id: string}>();
  const [searchParams] = useSearchParams();
  const clientQuery = useGetClientQuery(id!, {skip: !id});
  const conversationQuery = useGetCoachClientConversationQuery({clientId: id!}, {skip: !id});
  const detailPath = ROUTES.CLIENT_DETAIL.replace(':id', id!);
  const embedId = searchParams.get('embed_id');
  const initialEmbed =
    searchParams.get('embed_type') === 'form_submission' && embedId
      ? ({id: embedId, type: 'form_submission'} as const)
      : null;

  if (clientQuery.isLoading) {
    return (
      <ClientWorkspaceFallback backTo={detailPath}>
        <div className="h-full overflow-y-auto p-5 lg:p-8">
          <PageSkeleton />
        </div>
      </ClientWorkspaceFallback>
    );
  }

  if (clientQuery.isError || !clientQuery.data) {
    return (
      <ClientWorkspaceFallback backTo={detailPath}>
        <div className="p-5 lg:p-8">
          <ErrorState message="Client couldn't load. They may not exist, or you may not have access." />
        </div>
      </ClientWorkspaceFallback>
    );
  }

  const client = clientQuery.data.data;

  return (
    <ClientWorkspaceShell client={client}>
      {conversationQuery.isLoading ? (
        <div className="h-full overflow-y-auto p-5 lg:p-8">
          <PageSkeleton />
        </div>
      ) : conversationQuery.isError || !conversationQuery.data ? (
        <div className="p-5 lg:p-8">
          <ErrorState message="Conversation couldn't load. Try again in a moment." />
        </div>
      ) : (
        <ConversationView
          backTo={detailPath}
          clientId={id!}
          conversationId={conversationQuery.data.data.id}
          embedded
          initialEmbed={initialEmbed}
          title={conversationQuery.data.data.client_name || 'Client'}
        />
      )}
    </ClientWorkspaceShell>
  );
}

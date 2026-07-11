import {Alert} from '@heroui/react';
import {useParams, useSearchParams} from 'react-router-dom';

import {Page} from '@/@components/page';
import {PageSkeleton} from '@/@components/page-skeleton';
import {useGetClientQuery} from '@/api/clients';
import {useGetCoachClientConversationQuery} from '@/api/conversations';
import ClientWorkspaceShell from '@/clients/components/client-workspace-shell';
import ConversationView from '@/messages/conversation-view';

export default function ClientConversation() {
  const {id} = useParams<{id: string}>();
  const [searchParams] = useSearchParams();
  const clientQuery = useGetClientQuery(id!, {skip: !id});
  const conversationQuery = useGetCoachClientConversationQuery({clientId: id!}, {skip: !id});

  if (clientQuery.isLoading) {
    return (
      <Page>
        <Page.Content className="px-4 py-6 md:px-6 lg:px-8">
          <PageSkeleton />
        </Page.Content>
      </Page>
    );
  }

  if (clientQuery.isError || !clientQuery.data) {
    return (
      <Page>
        <Page.Content className="px-4 py-6 md:px-6 lg:px-8">
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Client couldn&apos;t load</Alert.Title>
              <Alert.Description>They may not exist, or you may not have access</Alert.Description>
            </Alert.Content>
          </Alert>
        </Page.Content>
      </Page>
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
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Conversation couldn&apos;t load</Alert.Title>
              <Alert.Description>Try again in a moment.</Alert.Description>
            </Alert.Content>
          </Alert>
        </div>
      ) : (
        <ConversationView
          backTo={`/clients/${id}`}
          conversationId={conversationQuery.data.data.id}
          embedded
          initialBody={searchParams.get('prefill') ?? ''}
          title={conversationQuery.data.data.client_name || 'Client'}
        />
      )}
    </ClientWorkspaceShell>
  );
}

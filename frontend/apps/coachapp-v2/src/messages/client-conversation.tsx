import {Spinner} from '@heroui/react';
import {useParams} from 'react-router-dom';

import {useGetCoachClientConversationQuery} from '@/api/conversations';
import ConversationView from '@/messages/conversation-view';

export default function ClientConversation() {
  const {id} = useParams<{id: string}>();
  const {data, isLoading} = useGetCoachClientConversationQuery({clientId: id!}, {skip: !id});

  if (isLoading || !data) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <ConversationView
      backTo={`/clients/${id}`}
      conversationId={data.data.id}
      title={data.data.client_name || 'Client'}
    />
  );
}

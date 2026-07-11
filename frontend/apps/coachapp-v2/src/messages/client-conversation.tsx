import {Spinner} from '@heroui/react';
import {useParams, useSearchParams} from 'react-router-dom';

import {useGetCoachClientConversationQuery} from '@/api/conversations';
import ConversationView from '@/messages/conversation-view';

export default function ClientConversation() {
  const {id} = useParams<{id: string}>();
  const [searchParams] = useSearchParams();
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
      initialBody={searchParams.get('prefill') ?? ''}
      title={data.data.client_name || 'Client'}
    />
  );
}

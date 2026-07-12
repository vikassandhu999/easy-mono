import {Spinner} from '@heroui/react';
import {useParams} from 'react-router-dom';

import {ROUTES} from '@/@config/routes';
import {useGetCoachConversationQuery} from '@/api/conversations';
import ConversationView from '@/messages/conversation-view';

export default function ConversationPage() {
  const {id} = useParams<{id: string}>();
  const {data, isLoading} = useGetCoachConversationQuery({id: id!}, {skip: !id});

  if (isLoading || !data) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <ConversationView
      backTo={ROUTES.MESSAGES}
      clientId={data.data.client_id}
      conversationId={data.data.id}
      title={data.data.client_name || 'Client'}
    />
  );
}

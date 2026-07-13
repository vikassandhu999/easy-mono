import {Spinner} from '@heroui/react';
import {useCallback} from 'react';
import {useParams, useSearchParams} from 'react-router-dom';

import {ErrorState} from '@/@components/error-state';
import {ROUTES} from '@/@config/routes';
import {useGetCoachClientConversationQuery} from '@/api/conversations';
import ConversationView from '@/messages/conversation-view';

export default function ClientConversation() {
  const {id} = useParams<{id: string}>();
  const [searchParams, setSearchParams] = useSearchParams();
  const {data, isError, isLoading} = useGetCoachClientConversationQuery({clientId: id!}, {skip: !id});
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
        <ErrorState message="Couldn't load this conversation." />
      </div>
    );
  }

  return (
    <ConversationView
      backTo={ROUTES.CLIENT_DETAIL.replace(':id', id!)}
      clientId={id!}
      conversationId={data.data.id}
      initialEmbed={initialEmbed}
      onEmbedSent={clearEmbedParams}
      title={data.data.client_name || 'Client'}
    />
  );
}

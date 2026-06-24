import {Button, Spinner, Typography} from '@heroui/react';
import {ArrowLeft} from 'lucide-react';
import {useNavigate, useParams} from 'react-router-dom';
import BrowseListBox from '@/@components/browse-list-box';
import {Page} from '@/@components/page';
import {useGoBack} from '@/@hooks/use-go-back';
import {useInfiniteItems} from '@/@hooks/use-infinite-items';
import {useCoachClientTrainingSessionsInfiniteQuery} from '@/api/client-training-sessions';
import {useGetClientQuery} from '@/api/clients';
import {SessionListItem} from '@/clients/components/client-workout-history';

export default function ClientWorkoutHistoryPage() {
  const {id} = useParams<{id: string}>();
  const navigate = useNavigate();
  const goBack = useGoBack(`/clients/${id}`);
  const {data: clientData, isLoading: isLoadingClient} = useGetClientQuery(id!);
  const client = clientData?.data;

  const list = useCoachClientTrainingSessionsInfiniteQuery({clientId: id!});
  const {fetchNextPage, isFetchingNextPage, isLoading, items: sessions} = useInfiniteItems(list);

  const clientName = client ? [client.first_name, client.last_name].filter(Boolean).join(' ') || 'Client' : 'Client';

  if (isLoadingClient) {
    return (
      <Page>
        <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
          <Page.TitleGroup>
            <Page.Title>Workout history</Page.Title>
          </Page.TitleGroup>
        </Page.Header>
        <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
          <div className="flex items-center justify-center py-20">
            <Spinner color="accent" />
          </div>
        </Page.Content>
      </Page>
    );
  }

  return (
    <Page>
      <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
        <Page.TitleGroup>
          <Page.Title>Workout history</Page.Title>
          <Page.Description>{clientName}</Page.Description>
        </Page.TitleGroup>
      </Page.Header>
      <Page.Toolbar>
        <Button
          onPress={goBack}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft size={16} />
          Client
        </Button>
      </Page.Toolbar>
      <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
        <div className="max-w-lg">
          {isLoading && sessions.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Spinner color="accent" />
            </div>
          ) : (
            <BrowseListBox
              ariaLabel="Workout history"
              emptyState={
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                  <Typography
                    type="body-sm"
                    weight="medium"
                  >
                    No workouts logged yet
                  </Typography>
                  <Typography
                    color="muted"
                    type="body-xs"
                  >
                    Workout sessions will appear here once the client starts logging
                  </Typography>
                </div>
              }
              fetchNextPage={fetchNextPage}
              isLoading={isFetchingNextPage}
              items={sessions}
              onAction={(key) => navigate(`/clients/${id}/sessions/${key}`)}
              renderItem={(session) => <SessionListItem session={session} />}
            />
          )}
        </div>
      </Page.Content>
    </Page>
  );
}

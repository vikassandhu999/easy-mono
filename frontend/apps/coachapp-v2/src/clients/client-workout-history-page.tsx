import {Button, Spinner, Typography} from '@heroui/react';
import {ArrowLeft} from 'lucide-react';
import {useMemo} from 'react';
import {useParams} from 'react-router-dom';

import type {WorkoutSession} from '@/api/workoutSessions';

import InfiniteList from '@/@components/infinite-list';
import {Page} from '@/@components/page';
import {useGoBack} from '@/@hooks/use-go-back';
import {useInfiniteScroll} from '@/@hooks/use-infinite-scroll';
import {useGetClientQuery} from '@/api/clients';
import {useWorkoutSessionsInfiniteQuery} from '@/api/workoutSessions';
import {SessionCard} from '@/clients/components/client-workout-history';

export default function ClientWorkoutHistoryPage() {
  const {id} = useParams<{id: string}>();
  const goBack = useGoBack(`/clients/${id}`);
  const {data: clientData, isLoading: isLoadingClient} = useGetClientQuery(id!);
  const client = clientData?.data;

  const {data, fetchNextPage, hasNextPage, isError, isFetchingNextPage, isLoading} = useWorkoutSessionsInfiniteQuery({
    client_id: id!,
  });

  const sessions = useMemo<WorkoutSession[]>(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.data);
  }, [data]);

  const {sentinelRef} = useInfiniteScroll({
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  });

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
          <InfiniteList
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
            hasNextPage={hasNextPage}
            isError={isError}
            isFetchingNextPage={isFetchingNextPage}
            isLoading={isLoading}
            items={sessions}
            keyExtractor={(session) => session.id}
            renderItem={(session) => (
              <SessionCard
                clientId={id!}
                session={session}
              />
            )}
            sentinelRef={sentinelRef}
          />
        </div>
      </Page.Content>
    </Page>
  );
}

import {Button, Spinner} from '@heroui/react';
import {ArrowLeft} from 'lucide-react';
import {useMemo} from 'react';
import {useParams} from 'react-router-dom';

import type {WorkoutSession} from '@/api/workoutSessions';

import InfiniteList from '@/@components/infinite-list';
import PageLayout from '@/@components/page-layout';
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
      <PageLayout title="Workout History">
        <div className="flex items-center justify-center py-20">
          <Spinner color="accent" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title={`${clientName} — Workout History`}>
      <div className="mb-4">
        <Button
          onPress={goBack}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft size={16} />
          Back
        </Button>
      </div>

      <div className="max-w-lg">
        <InfiniteList
          emptyState={
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <p className="text-sm font-medium text-foreground-500">No workouts logged yet</p>
              <p className="text-xs text-foreground-400">
                Workout sessions will appear here once the client starts logging.
              </p>
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
    </PageLayout>
  );
}

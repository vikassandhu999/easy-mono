import {useMemo} from 'react';

import {TrainingPlan, useListTrainingPlans} from '@/services/training_plans';

import ListView from '../ListView';
import TrainingPlanCard from '../TrainingPlanCard';

export interface TrainingPlanListProps {
  clientId?: string;
  onPlanClick?: (id: string) => void;
  search?: string;
}

const TrainingPlanList = ({onPlanClick, search, clientId}: TrainingPlanListProps) => {
  const {data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} = useListTrainingPlans({
    search: search || undefined,
    is_template: clientId ? undefined : true,
    client_id: clientId,
  });

  const plans = useMemo(() => data?.pages?.flatMap((page) => page.records) ?? [], [data?.pages]);

  return (
    <ListView<TrainingPlan>
      emptyState={'No training plans found. Create a new training plan to get started.'}
      getKey={(plan) => plan.id}
      hasMore={hasNextPage}
      items={plans}
      loadingMore={isFetchingNextPage}
      onLoadMore={fetchNextPage}
      querying={isLoading}
      render={(plan) => (
        <TrainingPlanCard
          key={plan.id}
          onClick={onPlanClick}
          plan={plan}
        />
      )}
    />
  );
};

export default TrainingPlanList;

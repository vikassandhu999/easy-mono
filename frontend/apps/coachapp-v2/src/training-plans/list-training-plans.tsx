import {Plus} from 'lucide-react';
import {useDeferredValue, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import BrowseScreen from '@/@components/browse-screen';
import ListEmptyState from '@/@components/list-empty-state';
import {ROUTES} from '@/@config/routes';
import {useInfiniteItems} from '@/@hooks/use-infinite-items';
import {useCoachTrainingPlansInfiniteQuery, useListTrainingPlansQuery} from '@/api/training-plans-list';

import TrainingPlanListItem from './training-plan-list-item';

type StatusFilter = 'active' | 'all' | 'archived';

export default function ListTrainingPlans() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');

  const deferredSearch = useDeferredValue(search);
  const list = useCoachTrainingPlansInfiniteQuery({
    search: deferredSearch,
    status: status === 'all' ? undefined : status,
  });
  const {fetchNextPage, isError, isLoading, items, refetch} = useInfiniteItems(list);

  // Per-status counts for the tabs. `count` is the total matching the filter
  // regardless of `limit`, so `limit: 1` reads it back cheaply. `All` is derived
  // rather than fetched — status is a closed active|archived enum.
  const {data: activeData} = useListTrainingPlansQuery({limit: 1, status: 'active'});
  const {data: archivedData} = useListTrainingPlansQuery({limit: 1, status: 'archived'});
  const activeCount = activeData?.count ?? 0;
  const archivedCount = archivedData?.count ?? 0;

  return (
    <BrowseScreen
      action={{icon: <Plus />, label: 'Create plan', to: ROUTES.CREATE_TRAINING_PLAN}}
      backTo={ROUTES.LIBRARY}
      description="Reusable workout splits and progressions for your clients"
      empty={
        <ListEmptyState
          createLabel="Create training plan"
          createRoute={ROUTES.CREATE_TRAINING_PLAN}
          emptyDescription="Create your first training plan to get started."
          hasFilter={!!deferredSearch || status !== 'all'}
          nounPlural="training plans"
        />
      }
      filters={{
        onSelect: setStatus,
        options: [
          {count: activeCount + archivedCount, id: 'all', label: 'All'},
          {count: activeCount, id: 'active', label: 'Active'},
          {count: archivedCount, id: 'archived', label: 'Archived'},
        ],
        selected: status,
      }}
      onOpen={(key) => navigate(ROUTES.TRAINING_PLAN_DETAIL.replace(':id', String(key)))}
      query={{fetchNextPage, isError, isLoading, items, refetch}}
      row={(plan) => (
        <TrainingPlanListItem
          isFirst={plan.id === items[0]?.id}
          plan={plan}
        />
      )}
      search={{
        onChange: setSearch,
        placeholder: 'Search training plans\u2026',
        shortPlaceholder: 'Search plans\u2026',
        value: search,
      }}
      shortTitle="Training"
      testId="tr"
      title="Training plans"
    />
  );
}

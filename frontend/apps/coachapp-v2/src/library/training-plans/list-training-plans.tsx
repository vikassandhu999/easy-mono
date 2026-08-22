import {Plus} from 'lucide-react';
import {useDeferredValue, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {useCoachTrainingPlansInfiniteQuery, useListTrainingPlansQuery} from '@/api/training-plans-list';
import BrowseScreen from '@/library/browse-screen';
import TrainingPlanListItem from '@/library/training-plans/training-plan-list-item';
import {ROUTES} from '@/routes';
import ListEmptyState from '@/ui/list-empty-state';
import {useInfiniteItems} from '@/ui/use-infinite-items';

type StatusFilter = 'active' | 'all' | 'archived';

export default function ListTrainingPlans() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');

  const deferredSearch = useDeferredValue(search);
  const list = useCoachTrainingPlansInfiniteQuery({
    ...(deferredSearch ? {search: deferredSearch} : {}),
    ...(status !== 'all' ? {archived: status === 'archived'} : {}),
  });
  const {fetchNextPage, isError, isLoading, items, refetch} = useInfiniteItems(list);

  // Per-archive-state counts for the tabs. `count` is the total matching the filter
  // regardless of `limit`, so `limit: 1` reads it back cheaply. `All` is derived
  // rather than fetched.
  const {data: activeData} = useListTrainingPlansQuery({archived: false, limit: 1});
  const {data: archivedData} = useListTrainingPlansQuery({archived: true, limit: 1});
  const activeCount = activeData?.count ?? 0;
  const archivedCount = archivedData?.count ?? 0;

  return (
    <BrowseScreen
      action={{icon: <Plus />, label: 'Create template', to: ROUTES.CREATE_TRAINING_PLAN}}
      backTo={ROUTES.LIBRARY}
      description="Reusable workout splits and progressions for your clients"
      empty={
        <ListEmptyState
          createLabel="Create training template"
          createRoute={ROUTES.CREATE_TRAINING_PLAN}
          emptyDescription="Create your first Training Template to get started."
          hasFilter={!!deferredSearch || status !== 'all'}
          nounPlural="training templates"
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
        placeholder: 'Search training templates\u2026',
        shortPlaceholder: 'Search templates\u2026',
        value: search,
      }}
      shortTitle="Training"
      testId="tr"
      title="Training templates"
    />
  );
}

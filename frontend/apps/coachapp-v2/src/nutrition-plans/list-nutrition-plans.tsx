import {Plus} from 'lucide-react';
import {useDeferredValue, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import BrowseScreen from '@/@components/browse-screen';
import ListEmptyState from '@/@components/list-empty-state';
import {ROUTES} from '@/@config/routes';
import {useInfiniteItems} from '@/@hooks/use-infinite-items';
import {useCoachNutritionPlansInfiniteQuery, useListNutritionPlansQuery} from '@/api/nutrition-plans-list';

import NutritionPlanListItem from './nutrition-plan-list-item';

type StatusFilter = 'active' | 'all' | 'archived';

export default function ListNutritionPlans() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');

  const deferredSearch = useDeferredValue(search);
  const list = useCoachNutritionPlansInfiniteQuery({
    search: deferredSearch,
    status: status === 'all' ? undefined : status,
  });
  const {fetchNextPage, isError, isLoading, items, refetch} = useInfiniteItems(list);

  // Per-status counts for the tabs. `count` is the total matching the filter
  // regardless of `limit`, so `limit: 1` reads it back cheaply. `All` is derived
  // rather than fetched — status is a closed active|archived enum.
  const {data: activeData} = useListNutritionPlansQuery({limit: 1, status: 'active'});
  const {data: archivedData} = useListNutritionPlansQuery({limit: 1, status: 'archived'});
  const activeCount = activeData?.count ?? 0;
  const archivedCount = archivedData?.count ?? 0;

  return (
    <BrowseScreen
      action={{icon: <Plus />, label: 'Create plan', to: ROUTES.CREATE_NUTRITION_PLAN}}
      backTo={ROUTES.LIBRARY}
      description="Reusable daily macro targets and meal structures for your clients"
      empty={
        <ListEmptyState
          createLabel="Create Nutrition Plan"
          createRoute={ROUTES.CREATE_NUTRITION_PLAN}
          emptyDescription="Create your first nutrition plan to get started."
          hasFilter={!!deferredSearch || status !== 'all'}
          nounPlural="nutrition plans"
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
      onOpen={(key) => navigate(ROUTES.NUTRITION_PLAN_DETAIL.replace(':id', String(key)))}
      query={{fetchNextPage, isError, isLoading, items, refetch}}
      row={(plan) => (
        <NutritionPlanListItem
          isFirst={plan.id === items[0]?.id}
          plan={plan}
        />
      )}
      search={{
        onChange: setSearch,
        placeholder: 'Search nutrition plans\u2026',
        shortPlaceholder: 'Search plans\u2026',
        value: search,
      }}
      shortTitle="Nutrition"
      testId="np"
      title="Nutrition plans"
    />
  );
}

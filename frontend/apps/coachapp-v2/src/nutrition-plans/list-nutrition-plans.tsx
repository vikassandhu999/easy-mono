import {Plus} from 'lucide-react';
import {useDeferredValue, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {useCoachNutritionPlansInfiniteQuery, useListNutritionPlansQuery} from '@/api/nutrition-plans-list';
import {ROUTES} from '@/routes';
import BrowseScreen from '@/ui/browse-screen';
import ListEmptyState from '@/ui/list-empty-state';
import {useInfiniteItems} from '@/ui/use-infinite-items';

import NutritionPlanListItem from './nutrition-plan-list-item';

type StatusFilter = 'active' | 'all' | 'archived';

export default function ListNutritionPlans() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');

  const deferredSearch = useDeferredValue(search);
  const list = useCoachNutritionPlansInfiniteQuery({
    ...(deferredSearch ? {search: deferredSearch} : {}),
    ...(status !== 'all' ? {archived: status === 'archived'} : {}),
  });
  const {fetchNextPage, isError, isLoading, items, refetch} = useInfiniteItems(list);

  // Per-archive-state counts for the tabs. `count` is the total matching the filter
  // regardless of `limit`, so `limit: 1` reads it back cheaply. `All` is derived
  // rather than fetched.
  const {data: activeData} = useListNutritionPlansQuery({archived: false, limit: 1});
  const {data: archivedData} = useListNutritionPlansQuery({archived: true, limit: 1});
  const activeCount = activeData?.count ?? 0;
  const archivedCount = archivedData?.count ?? 0;

  return (
    <BrowseScreen
      action={{icon: <Plus />, label: 'Create plan', to: ROUTES.CREATE_NUTRITION_PLAN}}
      backTo={ROUTES.LIBRARY}
      description="Reusable daily macro targets and meal structures for your clients"
      empty={
        <ListEmptyState
          createLabel="Create nutrition plan"
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

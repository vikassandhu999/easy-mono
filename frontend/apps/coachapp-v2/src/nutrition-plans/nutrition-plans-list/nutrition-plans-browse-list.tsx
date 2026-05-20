import {memo} from 'react';
import {useNavigate} from 'react-router-dom';

import {ROUTES} from '@/@config/routes';

import type {NutritionPlansListFilters} from './types';

import NutritionPlanEmptyState from './nutrition-plan-empty-state';
import NutritionPlanListBox from './nutrition-plan-list-box';
import NutritionPlanListItem from './nutrition-plan-list-item';
import NutritionPlansListQuery from './nutrition-plans-list-query';

type Props = NutritionPlansListFilters & {
  hasFilter: boolean;
};

const NutritionPlansBrowseList = memo(function NutritionPlansBrowseList({hasFilter, search}: Props) {
  const navigate = useNavigate();

  return (
    <NutritionPlansListQuery search={search}>
      {({fetchNextPage, isLoading, plans}) => (
        <NutritionPlanListBox
          emptyState={<NutritionPlanEmptyState hasFilter={hasFilter || !!search} />}
          fetchNextPage={fetchNextPage}
          isLoading={isLoading}
          onAction={(key) => navigate(ROUTES.NUTRITION_PLAN_DETAIL.replace(':id', String(key)))}
          plans={plans}
          renderItem={(plan) => (
            <NutritionPlanListItem
              className="!transition-none active:!scale-100 data-[pressed=true]:!scale-100"
              plan={plan}
            />
          )}
        />
      )}
    </NutritionPlansListQuery>
  );
});

export default NutritionPlansBrowseList;

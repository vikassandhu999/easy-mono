import {memo} from 'react';
import {useNavigate} from 'react-router-dom';

import {ROUTES} from '@/@config/routes';
import TrainingPlanEmptyState from './training-plan-empty-state';
import TrainingPlanListBox from './training-plan-list-box';
import TrainingPlanListItem from './training-plan-list-item';
import TrainingPlansListQuery from './training-plans-list-query';
import type {TrainingPlansListFilters} from './types';

type Props = TrainingPlansListFilters & {
  hasFilter: boolean;
};

const TrainingPlansBrowseList = memo(function TrainingPlansBrowseList({hasFilter, search}: Props) {
  const navigate = useNavigate();

  return (
    <TrainingPlansListQuery search={search}>
      {({fetchNextPage, isLoading, plans}) => (
        <TrainingPlanListBox
          emptyState={<TrainingPlanEmptyState hasFilter={hasFilter || !!search} />}
          fetchNextPage={fetchNextPage}
          isLoading={isLoading}
          onAction={(key) => navigate(ROUTES.TRAINING_PLAN_DETAIL.replace(':id', String(key)))}
          plans={plans}
          renderItem={(plan) => (
            <TrainingPlanListItem
              className={'transition-none transform-none animate-none'}
              plan={plan}
            />
          )}
        />
      )}
    </TrainingPlansListQuery>
  );
});

export default TrainingPlansBrowseList;

import {memo} from 'react';
import {useNavigate} from 'react-router-dom';

import {ROUTES} from '@/@config/routes';
import ExerciseEmptyState from './exercise-empty-state';
import ExerciseListBox from './exercise-list-box';
import ExerciseListItem from './exercise-list-item';
import ExercisesListQuery from './exercises-list-query';
import type {ExercisesListFilters} from './types';

type Props = ExercisesListFilters & {
  hasFilter: boolean;
};

const ExercisesBrowseList = memo(function ExercisesBrowseList({hasFilter, muscleIds, search}: Props) {
  const navigate = useNavigate();

  return (
    <ExercisesListQuery
      muscleIds={muscleIds}
      search={search}
    >
      {({exercises, fetchNextPage, isLoading}) => (
        <ExerciseListBox
          emptyState={<ExerciseEmptyState hasFilter={hasFilter || !!search || muscleIds.length > 0} />}
          exercises={exercises}
          fetchNextPage={fetchNextPage}
          isLoading={isLoading}
          onAction={(key) => navigate(ROUTES.EXERCISE_DETAIL.replace(':id', String(key)))}
          renderItem={(exercise) => (
            <ExerciseListItem
              className="!transition-none active:!scale-100 data-[pressed=true]:!scale-100"
              exercise={exercise}
            />
          )}
        />
      )}
    </ExercisesListQuery>
  );
});

export default ExercisesBrowseList;

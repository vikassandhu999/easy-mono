import {memo} from 'react';
import {useNavigate} from 'react-router-dom';

import {ROUTES} from '@/@config/routes';
import FoodEmptyState from './food-empty-state';
import FoodListBox from './food-list-box';
import FoodListItem from './food-list-item';
import FoodsListQuery from './foods-list-query';
import type {FoodsListFilters} from './types';

type Props = FoodsListFilters & {
  hasFilter: boolean;
};

const FoodsBrowseList = memo(function FoodsBrowseList({hasFilter, search}: Props) {
  const navigate = useNavigate();

  return (
    <FoodsListQuery search={search}>
      {({fetchNextPage, foods, isLoading}) => (
        <FoodListBox
          emptyState={<FoodEmptyState hasFilter={hasFilter || !!search} />}
          fetchNextPage={fetchNextPage}
          foods={foods}
          isLoading={isLoading}
          onAction={(key) => navigate(ROUTES.FOOD_DETAIL.replace(':id', String(key)))}
          renderItem={(food) => (
            <FoodListItem
              className="!transition-none active:!scale-100 data-[pressed=true]:!scale-100"
              food={food}
            />
          )}
        />
      )}
    </FoodsListQuery>
  );
});

export default FoodsBrowseList;

import {Button, Collection, ListBox, ListBoxLoadMoreItem, Spinner, Typography} from '@heroui/react';
import {Plus} from 'lucide-react';
import {memo, useMemo} from 'react';
import {useNavigate} from 'react-router-dom';

import {ROUTES} from '@/@config/routes';
import {type Food, useFoodsInfiniteQuery} from '@/api/foods';
import FoodCard from '@/foods/components/food-card';

type Props = {
  hasFilter: boolean;
  search: string;
};

const FoodsList = memo(function FoodsList({hasFilter, search}: Props) {
  const navigate = useNavigate();

  const list = useFoodsInfiniteQuery({search});

  const foods = useMemo<Food[]>(() => {
    return list.data?.pages.flatMap((page) => page.data) ?? [];
  }, [list.data]);

  return (
    <ListBox
      aria-label="Foods"
      className="flex-1"
      onAction={(key) => navigate(ROUTES.FOOD_DETAIL.replace(':id', String(key)))}
      renderEmptyState={() => (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
          {hasFilter ? (
            <>
              <Typography type="h5">No foods found</Typography>
              <Typography
                color="muted"
                type="body-xs"
              >
                Try adjusting your search to find what you&apos;re looking for.
              </Typography>
            </>
          ) : (
            <>
              <Typography type="h5">No foods yet</Typography>
              <Typography
                color="muted"
                type="body-xs"
              >
                Create your first food to get started.
              </Typography>
              <Button
                className="mt-3"
                onPress={() => navigate(ROUTES.CREATE_FOOD)}
                size="sm"
              >
                <Plus size={16} />
                Create Food
              </Button>
            </>
          )}
        </div>
      )}
      selectionMode="none"
    >
      <Collection items={foods}>{(food) => <FoodCard food={food} />}</Collection>
      <ListBoxLoadMoreItem
        isLoading={list.isLoading}
        onLoadMore={list.fetchNextPage}
      >
        <div className="flex items-center justify-center gap-2 py-2">
          <Spinner size="sm" />
          <Typography
            color="muted"
            type="body-sm"
          >
            Loading more...
          </Typography>
        </div>
      </ListBoxLoadMoreItem>
    </ListBox>
  );
});

export default FoodsList;

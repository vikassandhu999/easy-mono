import {memo} from 'react';
import {useNavigate} from 'react-router-dom';

import {ROUTES} from '@/@config/routes';

import type {RecipesListFilters} from './types';

import RecipeEmptyState from './recipe-empty-state';
import RecipeListBox from './recipe-list-box';
import RecipeListItem from './recipe-list-item';
import RecipesListQuery from './recipes-list-query';

type Props = RecipesListFilters & {
  hasFilter: boolean;
};

const RecipesBrowseList = memo(function RecipesBrowseList({hasFilter, search}: Props) {
  const navigate = useNavigate();

  return (
    <RecipesListQuery search={search}>
      {({fetchNextPage, isLoading, recipes}) => (
        <RecipeListBox
          emptyState={<RecipeEmptyState hasFilter={hasFilter || !!search} />}
          fetchNextPage={fetchNextPage}
          isLoading={isLoading}
          onAction={(key) => navigate(ROUTES.RECIPE_DETAIL.replace(':id', String(key)))}
          recipes={recipes}
          renderItem={(recipe) => (
            <RecipeListItem
              className="!transition-none active:!scale-100 data-[pressed=true]:!scale-100"
              recipe={recipe}
            />
          )}
        />
      )}
    </RecipesListQuery>
  );
});

export default RecipesBrowseList;

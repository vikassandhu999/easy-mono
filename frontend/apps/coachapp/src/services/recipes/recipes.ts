import {baseAPISlice} from '../baseAPISlice';
import {CreateRecipe, Recipe, RecipesList, RecipesListOpts, UpdateRecipe} from './recipes_definition';

import {buildListParams, getNextPage} from '../paginationUtils';

export const recipesApi = baseAPISlice.injectEndpoints({
    endpoints: (build) => ({
        createRecipe: build.mutation<Recipe, CreateRecipe>({
            query: (body) => ({
                url: '/api/recipes',
                method: 'post',
                data: body,
            }),
            transformResponse: (response: {data: Recipe}) => response.data,
            invalidatesTags: (result) => [
                {type: 'Recipes', id: result?.id},
                {type: 'Recipes', id: 'LIST'},
            ],
        }),

        getRecipe: build.query<Recipe, string>({
            query: (recipeId) => ({
                url: `/api/recipes/${recipeId}`,
                method: 'get',
            }),
            transformResponse: (response: {data: Recipe}) => response.data,
            providesTags: (_result, _error, recipeId) => [{type: 'Recipes', id: recipeId}],
        }),

        updateRecipe: build.mutation<Recipe, UpdateRecipe>({
            query: (body) => ({
                url: '/api/recipes/' + body.id,
                method: 'patch',
                data: {
                    ...body,
                    id: undefined,
                    inserted_at: undefined,
                    updated_at: undefined,
                },
            }),
            transformResponse: (response: {data: Recipe}) => response.data,
            invalidatesTags: (result) => [
                {type: 'Recipes', id: result?.id},
                {type: 'Recipes', id: 'LIST'},
            ],
        }),

        listRecipes: build.infiniteQuery<RecipesList, RecipesListOpts, number>({
            query: ({queryArg, pageParam = 0}) => ({
                url: '/api/recipes',
                method: 'get',
                params: buildListParams(queryArg, pageParam),
            }),
            transformResponse: (response: {data: Recipe[]; meta: RecipesList['meta']}) => ({
                records: response.data,
                meta: response.meta,
            }),
            providesTags: (result) => {
                const baseTag = [{type: 'Recipes' as const, id: 'LIST'}];

                if (!result) {
                    return baseTag;
                }

                const records = result.pages.flatMap((page) => page.records);

                if (records.length === 0) {
                    return baseTag;
                }

                return [
                    ...records.map((recipe) => ({
                        type: 'Recipes' as const,
                        id: recipe.id,
                    })),
                    ...baseTag,
                ];
            },
            infiniteQueryOptions: {
                initialPageParam: 0,
                getNextPageParam: (lastPage) => getNextPage(lastPage),
            },
        }),

        deleteRecipe: build.mutation<void, string>({
            query: (recipeId) => ({
                url: `/api/recipes/${recipeId}`,
                method: 'delete',
            }),
            invalidatesTags: (_result, _error, recipeId) => [
                {type: 'Recipes', id: recipeId},
                {type: 'Recipes', id: 'LIST'},
            ],
        }),
    }),
    overrideExisting: false,
});

export const {
    useCreateRecipeMutation: useCreateRecipe,
    useUpdateRecipeMutation: useUpdateRecipe,
    useGetRecipeQuery: useGetRecipe,
    useListRecipesInfiniteQuery: useListRecipes,
    useDeleteRecipeMutation: useDeleteRecipe,
} = recipesApi;

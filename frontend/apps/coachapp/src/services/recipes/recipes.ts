import {baseAPISlice} from '../baseAPISlice';
import {CreateRecipe, Recipe, RecipesList, RecipesListOpts, UpdateRecipe} from './recipes_definition';

const DEFAULT_LIMIT = 50;

const buildListParams = (opts: RecipesListOpts, pageParam: number) => {
    const limit = opts.per_page ?? DEFAULT_LIMIT;
    const offset = pageParam;

    const params: Record<string, unknown> = {
        ...opts,
        limit,
        offset,
    };

    // Remove per_page as we're using limit/offset
    delete params.per_page;
    delete params.page;

    return params;
};

const getNextRecipePage = (lastPage: RecipesList) => {
    const {offset, limit, total} = lastPage.meta;

    // If no total or no records, no next page
    if (!total || total <= 0) {
        return undefined;
    }

    // Calculate next offset
    const nextOffset = offset + limit;

    // If next offset is beyond total, no next page
    if (nextOffset >= total) {
        return undefined;
    }

    return nextOffset;
};

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
                getNextPageParam: (lastPage) => getNextRecipePage(lastPage),
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

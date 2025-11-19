import {baseAPISlice} from '../baseAPISlice';
import {
    CreateIngredient,
    Ingredient,
    IngredientsList,
    IngredientsListOpts,
    UpdateIngredient,
} from './ingrdients_definition';

const DEFAULT_LIMIT = 50;

const buildListParams = (opts: IngredientsListOpts, pageParam: number) => {
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

const getNextIngredientPage = (lastPage: IngredientsList) => {
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

export const ingredientsApi = baseAPISlice.injectEndpoints({
    endpoints: (build) => ({
        createIngredient: build.mutation<Ingredient, CreateIngredient>({
            query: (body) => ({
                url: '/api/ingredients',
                method: 'post',
                data: body,
            }),
            transformResponse: (response: {data: Ingredient}) => response.data,
            invalidatesTags: (result) => [
                {type: 'Ingredients', id: result?.id},
                {type: 'Ingredients', id: 'LIST'},
            ],
        }),

        getIngredient: build.query<Ingredient, string>({
            query: (ingredientId) => ({
                url: `/api/ingredients/${ingredientId}`,
                method: 'get',
            }),
            transformResponse: (response: {data: Ingredient}) => response.data,
            providesTags: (_result, _error, ingredientId) => [{type: 'Ingredients', id: ingredientId}],
        }),

        updateIngredient: build.mutation<Ingredient, UpdateIngredient>({
            query: (body) => ({
                url: '/api/ingredients/' + body.id,
                method: 'patch',
                data: {
                    ...body,
                    id: undefined,
                    inserted_at: undefined,
                    updated_at: undefined,
                },
            }),
            transformResponse: (response: {data: Ingredient}) => response.data,
            invalidatesTags: (result) => [
                {type: 'Ingredients', id: result?.id},
                {type: 'Ingredients', id: 'LIST'},
            ],
        }),

        listIngredients: build.infiniteQuery<IngredientsList, IngredientsListOpts, number>({
            query: ({queryArg, pageParam = 0}) => ({
                url: '/api/ingredients',
                method: 'get',
                params: buildListParams(queryArg, pageParam),
            }),
            transformResponse: (response: {data: Ingredient[]; meta: IngredientsList['meta']}) => ({
                records: response.data,
                meta: response.meta,
            }),
            providesTags: (result) => {
                const baseTag = [{type: 'Ingredients' as const, id: 'LIST'}];

                if (!result) {
                    return baseTag;
                }

                const records = result.pages.flatMap((page) => page.records);

                if (records.length === 0) {
                    return baseTag;
                }

                return [
                    ...records.map((ingredient) => ({
                        type: 'Ingredients' as const,
                        id: ingredient.id,
                    })),
                    ...baseTag,
                ];
            },
            infiniteQueryOptions: {
                initialPageParam: 0,
                getNextPageParam: (lastPage) => getNextIngredientPage(lastPage),
            },
        }),

        deleteIngredient: build.mutation<void, string>({
            query: (ingredientId) => ({
                url: `/api/ingredients/${ingredientId}`,
                method: 'delete',
            }),
            invalidatesTags: (_result, _error, ingredientId) => [
                {type: 'Ingredients', id: ingredientId},
                {type: 'Ingredients', id: 'LIST'},
            ],
        }),
    }),
    overrideExisting: false,
});

export const {
    useCreateIngredientMutation: useCreateIngredient,
    useUpdateIngredientMutation: useUpdateIngredient,
    useGetIngredientQuery: useGetIngredient,
    useListIngredientsInfiniteQuery: useListIngredients,
    useDeleteIngredientMutation: useDeleteIngredient,
} = ingredientsApi;

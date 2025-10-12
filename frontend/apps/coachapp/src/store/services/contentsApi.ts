import {
    type Content,
    CreateContent_zod,
    type CreateContentProps,
    type ListContentsProps,
    type ListContentsResult,
    UpdateContent_zod,
    type UpdateContentProps,
} from '@/api/contents.ts';

import {apiSlice} from './apiSlice';

type ListContentsQueryParams = Omit<ListContentsProps, 'page'> | undefined;

const DEFAULT_PAGE_SIZE = 20;

const buildContentListParams = (queryArg: ListContentsQueryParams, pageParam: number) => {
    const params: Record<string, unknown> = {
        ...(queryArg ?? {}),
        page: pageParam,
    };

    if (!('page_size' in params) || typeof params.page_size !== 'number') {
        params.page_size = DEFAULT_PAGE_SIZE;
    }

    return params;
};

const getNextContentPage = (lastPage: ListContentsResult, lastPageParam: number) => {
    const currentPage = lastPage.page ?? lastPageParam;
    const pageSize = lastPage.page_size ?? DEFAULT_PAGE_SIZE;

    if (!pageSize || pageSize <= 0) {
        return undefined;
    }

    if (typeof lastPage.total === 'number') {
        if (lastPage.total <= 0) {
            return undefined;
        }

        const totalPages = Math.ceil(lastPage.total / pageSize);

        if (currentPage >= totalPages) {
            return undefined;
        }

        return currentPage + 1;
    }

    if (lastPage.records.length < pageSize) {
        return undefined;
    }

    return currentPage + 1;
};

export const contentsApi = apiSlice.injectEndpoints({
    endpoints: (build) => ({
        listContents: build.infiniteQuery<ListContentsResult, ListContentsQueryParams, number>({
            query: ({queryArg, pageParam = 1}) => ({
                url: '/v1/coach/contents',
                method: 'get',
                params: buildContentListParams(queryArg, pageParam),
            }),
            serializeQueryArgs: ({queryArgs, endpointName}) => {
                return `${endpointName}-${JSON.stringify(queryArgs ?? {})}`;
            },
            providesTags: (result) => {
                const baseTag = [{type: 'Contents' as const, id: 'LIST'}];

                if (!result) {
                    return baseTag;
                }

                const records = result.pages.flatMap((page) => page.records);

                if (records.length === 0) {
                    return baseTag;
                }

                return [...records.map((content) => ({type: 'Contents' as const, id: content.id})), ...baseTag];
            },
            infiniteQueryOptions: {
                initialPageParam: 1,
                getNextPageParam: (lastPage, _allPages, lastPageParam) => getNextContentPage(lastPage, lastPageParam),
            },
        }),
        getContent: build.query<Content, string>({
            query: (id) => ({
                url: `/v1/coach/contents/${id}`,
                method: 'get',
            }),
            providesTags: (_result, _error, id) => [{type: 'Contents', id}],
        }),
        createContent: build.mutation<Content, CreateContentProps>({
            query: (body) => {
                // Validate input using Zod schema
                const validatedBody = CreateContent_zod.parse(body);
                return {
                    url: '/v1/coach/contents',
                    method: 'post',
                    data: validatedBody,
                };
            },
            invalidatesTags: [{type: 'Contents', id: 'LIST'}],
        }),
        updateContent: build.mutation<Content, {data: UpdateContentProps; id: string}>({
            query: ({id, data}) => {
                // Validate input using Zod schema
                const validatedData = UpdateContent_zod.parse(data);
                return {
                    url: `/v1/coach/contents/${id}`,
                    method: 'patch',
                    data: validatedData,
                };
            },
            invalidatesTags: (_result, _error, {id}) => [
                {type: 'Contents', id},
                {type: 'Contents', id: 'LIST'},
            ],
        }),
        archiveContent: build.mutation<void, string>({
            query: (id) => ({
                url: `/v1/coach/contents/${id}/archive`,
                method: 'post',
            }),
            invalidatesTags: (_result, _error, id) => [
                {type: 'Contents', id},
                {type: 'Contents', id: 'LIST'},
            ],
        }),
        unarchiveContent: build.mutation<void, string>({
            query: (id) => ({
                url: `/v1/coach/contents/${id}/unarchive`,
                method: 'post',
            }),
            invalidatesTags: (_result, _error, id) => [
                {type: 'Contents', id},
                {type: 'Contents', id: 'LIST'},
            ],
        }),
        duplicateContent: build.mutation<Content, {id: string; name: string}>({
            query: ({id, name}) => ({
                url: `/v1/coach/contents/${id}/duplicate`,
                method: 'post',
                data: {name},
            }),
            invalidatesTags: [{type: 'Contents', id: 'LIST'}],
        }),
    }),
    overrideExisting: false,
});

export const {
    useListContentsInfiniteQuery,
    useGetContentQuery,
    useCreateContentMutation,
    useUpdateContentMutation,
    useArchiveContentMutation,
    useUnarchiveContentMutation,
    useDuplicateContentMutation,
} = contentsApi;

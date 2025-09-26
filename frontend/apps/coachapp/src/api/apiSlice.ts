import {createApi} from '@reduxjs/toolkit/query/react';

import {authenticatedBaseQuery, commonQueryConfig, tagTypes} from '@/lib/baseQuery';

// Example interfaces for API responses
interface ApiResponse<T> {
    data: T;
    message: string;
    success: boolean;
}

interface Client {
    createdAt: string;
    email: string;
    id: string;
    name: string;
    notes?: string;
    phone?: string;
    updatedAt: string;
}

interface PaginatedResponse<T> {
    data: T[];
    meta: {
        limit: number;
        page: number;
        total: number;
        totalPages: number;
    };
}

interface User {
    avatar?: string;
    createdAt: string;
    email: string;
    id: string;
    name: string;
    role: string;
    updatedAt: string;
}

/**
 * Main API slice for the application
 * This serves as an example of how to use the baseQuery
 */
export const api = createApi({
    reducerPath: 'api',
    baseQuery: authenticatedBaseQuery,
    tagTypes,
    ...commonQueryConfig,
    endpoints: (builder) => ({
        // User endpoints
        getMe: builder.query<ApiResponse<User>, void>({
            query: () => ({
                url: '/auth/me',
                method: 'GET',
            }),
            providesTags: ['User', 'Auth'],
        }),

        updateProfile: builder.mutation<ApiResponse<User>, Partial<User>>({
            query: (data) => ({
                url: '/user/profile',
                method: 'PUT',
                data,
            }),
            invalidatesTags: ['User'],
        }),

        // Client management endpoints
        getClients: builder.query<PaginatedResponse<Client>, {limit?: number; page?: number; search?: string}>({
            query: ({limit = 10, page = 1, search}) => ({
                url: '/clients',
                method: 'GET',
                params: {limit, page, search},
            }),
            providesTags: (result) =>
                result
                    ? [...result.data.map(({id}) => ({type: 'Client' as const, id})), {type: 'Client', id: 'LIST'}]
                    : [{type: 'Client', id: 'LIST'}],
        }),

        getClient: builder.query<ApiResponse<Client>, string>({
            query: (id) => ({
                url: `/clients/${id}`,
                method: 'GET',
            }),
            providesTags: (_result, _error, id) => [{type: 'Client', id}],
        }),

        createClient: builder.mutation<ApiResponse<Client>, Omit<Client, 'createdAt' | 'id' | 'updatedAt'>>({
            query: (data) => ({
                url: '/clients',
                method: 'POST',
                data,
            }),
            invalidatesTags: [{type: 'Client', id: 'LIST'}],
        }),

        updateClient: builder.mutation<ApiResponse<Client>, {data: Partial<Client>; id: string}>({
            query: ({id, data}) => ({
                url: `/clients/${id}`,
                method: 'PUT',
                data,
            }),
            invalidatesTags: (_result, _error, {id}) => [
                {type: 'Client', id},
                {type: 'Client', id: 'LIST'},
            ],
        }),

        deleteClient: builder.mutation<ApiResponse<void>, string>({
            query: (id) => ({
                url: `/clients/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: (_result, _error, id) => [
                {type: 'Client', id},
                {type: 'Client', id: 'LIST'},
            ],
        }),

        // Dashboard/Analytics endpoints
        getDashboardStats: builder.query<
            ApiResponse<{
                activeSessions: number;
                completedGoals: number;
                revenue: number;
                totalClients: number;
            }>,
            void
        >({
            query: () => ({
                url: '/dashboard/stats',
                method: 'GET',
            }),
            providesTags: ['Dashboard', 'Analytics'],
        }),
    }),
});

// Export hooks for usage in functional components
export const {
    useGetMeQuery,
    useUpdateProfileMutation,
    useGetClientsQuery,
    useGetClientQuery,
    useCreateClientMutation,
    useUpdateClientMutation,
    useDeleteClientMutation,
    useGetDashboardStatsQuery,
} = api;

// Export the API slice
export default api;

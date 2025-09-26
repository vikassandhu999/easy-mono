# RTK Query BaseQuery Integration Guide

This guide shows how to integrate the new RTK Query baseQuery with your existing Redux store.

## Files Created

1. **`src/lib/baseQuery.ts`** - Main baseQuery implementation with authentication support
2. **`src/api/apiSlice.ts`** - Example API slice showing usage patterns

## Integration Steps

### 1. Update Your Store Configuration

Update `src/store/index.tsx` to include the API slice:

```tsx
import {configureStore} from '@reduxjs/toolkit';
import {Provider} from 'react-redux';
import {setupListeners} from '@reduxjs/toolkit/query';

import api from '@/api/apiSlice';

export const store = configureStore({
    reducer: {
        // Add the generated reducer as a specific top-level slice
        api: api.reducer,
        // Add other reducers here
    },
    // Adding the api middleware enables caching, invalidation, polling,
    // and other useful features of RTK Query
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(api.middleware),
});

// Optional, but required for refetchOnFocus/refetchOnReconnect behaviors
setupListeners(store.dispatch);

export const StoreProvider = ({children}: {children: React.ReactNode}) => {
    return <Provider store={store}>{children}</Provider>;
};

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
```

### 2. Using the BaseQuery

The baseQuery provides several pre-configured options:

#### Authenticated Requests (Default)
```tsx
import {createApi} from '@reduxjs/toolkit/query/react';
import {authenticatedBaseQuery, tagTypes} from '@/lib/baseQuery';

export const myApi = createApi({
    reducerPath: 'myApi',
    baseQuery: authenticatedBaseQuery,
    tagTypes,
    endpoints: (builder) => ({
        getProtectedData: builder.query<Data, void>({
            query: () => ({
                url: '/protected-endpoint',
                method: 'GET',
            }),
        }),
    }),
});
```

#### Public Requests (No Authentication)
```tsx
import {publicBaseQuery} from '@/lib/baseQuery';

export const publicApi = createApi({
    reducerPath: 'publicApi',
    baseQuery: publicBaseQuery,
    endpoints: (builder) => ({
        getPublicData: builder.query<Data, void>({
            query: () => ({
                url: '/public-endpoint',
                method: 'GET',
                skipAuth: true, // This ensures no auth headers are added
            }),
        }),
    }),
});
```

#### Custom Configuration
```tsx
import {axiosBaseQuery} from '@/lib/baseQuery';

const customBaseQuery = axiosBaseQuery({
    baseUrl: 'https://api.example.com',
    requiresAuth: true,
});

export const customApi = createApi({
    reducerPath: 'customApi',
    baseQuery: customBaseQuery,
    endpoints: (builder) => ({
        // Your endpoints here
    }),
});
```

### 3. Using in Components

```tsx
import React from 'react';
import {useGetClientsQuery, useCreateClientMutation} from '@/api/apiSlice';

export const ClientsList: React.FC = () => {
    const {
        data: clientsResponse,
        error,
        isLoading,
        refetch,
    } = useGetClientsQuery({
        page: 1,
        limit: 10,
        search: '',
    });

    const [createClient, {isLoading: isCreating}] = useCreateClientMutation();

    const handleCreateClient = async (clientData: CreateClientData) => {
        try {
            await createClient(clientData).unwrap();
            // Success - the query will automatically refetch due to cache invalidation
        } catch (error) {
            console.error('Failed to create client:', error);
        }
    };

    if (isLoading) return <div>Loading...</div>;
    if (error) return <div>Error loading clients</div>;

    return (
        <div>
            {clientsResponse?.data.map((client) => (
                <div key={client.id}>{client.name}</div>
            ))}
        </div>
    );
};
```

### 4. Advanced Features

#### Cache Invalidation
The baseQuery includes automatic cache invalidation using tags:

```tsx
// This mutation will invalidate all Client queries
deleteClient: builder.mutation<void, string>({
    query: (id) => ({
        url: \`/clients/\${id}\`,
        method: 'DELETE',
    }),
    invalidatesTags: (result, error, id) => [
        {type: 'Client', id},
        {type: 'Client', id: 'LIST'},
    ],
}),
```

#### Error Handling
The baseQuery includes comprehensive error handling:

- Automatic retry for 5xx errors
- No retry for 4xx client errors
- Development logging
- Structured error responses

#### Authentication Integration
The baseQuery automatically:

- Uses the existing `authClient` for authenticated requests
- Handles token refresh through existing interceptors
- Provides `skipAuth` option for public endpoints

### 5. Environment Variables

Make sure these environment variables are set:

```env
VITE_API_BASE_URL=https://your-api-url.com
```

### 6. TypeScript Support

The baseQuery provides full TypeScript support:

```tsx
// Define your API response types
interface User {
    id: string;
    name: string;
    email: string;
}

interface ApiResponse<T> {
    data: T;
    message: string;
    success: boolean;
}

// Use with RTK Query
getUser: builder.query<ApiResponse<User>, string>({
    query: (id) => ({
        url: \`/users/\${id}\`,
        method: 'GET',
    }),
}),
```

## Migration from Existing Code

If you have existing API calls using the `authClient`, you can gradually migrate them to RTK Query:

### Before (using authClient directly)
```tsx
const fetchClients = async () => {
    try {
        const response = await authClient.get('/clients');
        setClients(response.data);
    } catch (error) {
        setError(error);
    }
};
```

### After (using RTK Query)
```tsx
const {data: clients, error, isLoading} = useGetClientsQuery();
```

## Benefits

1. **Automatic Caching** - Reduces unnecessary API calls
2. **Cache Invalidation** - Automatic data updates
3. **Loading States** - Built-in loading and error states
4. **Optimistic Updates** - Better UX with optimistic updates
5. **Background Refetching** - Keep data fresh automatically
6. **TypeScript Support** - Full type safety
7. **DevTools Integration** - Better debugging experience

## Next Steps

1. Update your store configuration to include the API slice
2. Start migrating existing API calls to RTK Query endpoints
3. Take advantage of automatic caching and invalidation
4. Use the provided hooks in your components

The baseQuery is designed to work seamlessly with your existing authentication system while providing all the benefits of RTK Query.
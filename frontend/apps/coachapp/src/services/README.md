# Services Directory 📡

## Overview

The `services` directory contains all API service definitions and data fetching logic for the CoachEasy application. This folder uses **RTK Query** (Redux Toolkit Query) to manage server state, API calls, and caching.

## Directory Structure

```
services/
├── baseAPISlice.ts          # Base API configuration and axios setup
├── auth/                    # Authentication services
│   ├── auth.ts             # Auth API endpoints
│   ├── auth_definition.ts  # TypeScript definitions
│   └── index.ts            # Public exports
├── business/               # Business-related services
├── chats/                  # Chat functionality services
├── clients/                # Client management services
├── coach/                  # Coach-specific services
├── contents/               # Content management services
├── plans/                  # Training/nutrition plans services
├── plan_sessions/          # Plan session management
├── session/                # Individual session services
└── users/                  # User management services
```

## Core Concepts

### Base API Configuration

All services extend from `baseAPISlice.ts` which provides:

- Axios instance configuration
- Base URL resolution
- Authentication token management
- Error handling
- Request/response interceptors

### Service Structure

Each service folder follows a consistent pattern:

```
service-name/
├── index.ts                 # Public API exports
├── [name].ts               # RTK Query API definitions
└── [name]_definition.ts    # TypeScript types and interfaces
```

## Usage Guide

### 1. Importing Services

```typescript
// Import hooks and types from service modules
import { useLoginMutation, useGetUserQuery } from "@/services/auth";
import { useListClientsQuery } from "@/services/clients";
import { Plan, useGetPlanQuery } from "@/services/plans";
```

### 2. Using Query Hooks (GET requests)

```typescript
function MyComponent() {
  // Basic query
  const { data, isLoading, error } = useGetUserQuery(userId);

  // Query with parameters
  const { data: clients } = useListClientsQuery({
    page: 1,
    limit: 10,
    search: "john",
  });

  // Conditional fetching
  const { data: plan } = useGetPlanQuery(planId, {
    skip: !planId, // Skip query if planId is not available
  });
}
```

### 3. Using Mutation Hooks (POST/PUT/DELETE)

```typescript
function LoginForm() {
  const [login, { isLoading, error }] = useLoginMutation();

  const handleSubmit = async (credentials) => {
    try {
      const result = await login({
        email: credentials.email,
        password: credentials.password,
      }).unwrap();

      // Handle success
      console.log("Login successful:", result);
    } catch (err) {
      // Handle error
      console.error("Login failed:", err);
    }
  };
}
```

### 4. Cache Management

RTK Query automatically caches responses. You can invalidate caches using tags:

```typescript
// In your API definition
endpoints: (builder) => ({
  getClients: builder.query({
    query: () => "/clients",
    providesTags: ["Clients"],
  }),
  addClient: builder.mutation({
    query: (client) => ({
      url: "/clients",
      method: "POST",
      data: client,
    }),
    invalidatesTags: ["Clients"], // Refetch clients after adding
  }),
});
```

## Service Modules

### Auth Service (`/auth`)

- **Purpose**: Handle authentication, registration, and token management
- **Key Endpoints**:
  - `login`: User login
  - `register`: New user registration
  - `refreshToken`: Token refresh
  - `logout`: User logout
  - `verifyPhone`: Phone verification
  - `resetPassword`: Password reset

### Clients Service (`/clients`)

- **Purpose**: Manage coach-client relationships
- **Key Endpoints**:
  - `listClients`: Get all clients
  - `getClient`: Get single client details
  - `inviteClient`: Send client invitation
  - `updateClient`: Update client information
  - `deleteClient`: Remove client

### Plans Service (`/plans`)

- **Purpose**: Manage training and nutrition plans
- **Key Endpoints**:
  - `listPlans`: Get all plans
  - `getPlan`: Get single plan details
  - `createPlan`: Create new plan
  - `updatePlan`: Update existing plan
  - `assignPlan`: Assign plan to client
  - `deletePlan`: Remove plan

### Contents Service (`/contents`)

- **Purpose**: Manage exercises, meals, and other content
- **Key Endpoints**:
  - `listContents`: Get content library
  - `getContent`: Get content details
  - `createContent`: Add new content
  - `updateContent`: Edit content
  - `searchContent`: Search content

### Session Service (`/session`)

- **Purpose**: Manage individual workout/meal sessions
- **Key Endpoints**:
  - `listSessions`: Get all sessions
  - `getSession`: Get session details
  - `createSession`: Create new session
  - `updateSession`: Update session
  - `deleteSession`: Remove session

### Chats Service (`/chats`)

- **Purpose**: Handle messaging between coach and clients
- **Key Endpoints**:
  - `listChats`: Get chat conversations
  - `getMessages`: Get chat messages
  - `sendMessage`: Send new message
  - `markAsRead`: Mark messages as read

## Best Practices

### 1. Type Safety

Always use TypeScript definitions from `*_definition.ts` files:

```typescript
import type { Plan, PlanCreateRequest } from "@/services/plans";

const newPlan: PlanCreateRequest = {
  name: "Beginner Workout",
  discipline: "workout",
  duration: 4,
};
```

### 2. Error Handling

Always handle errors appropriately:

```typescript
const { data, error, isLoading } = useGetPlanQuery(id);

if (isLoading) return <Spinner />;
if (error) return <ErrorMessage error={error} />;
if (!data) return <EmptyState />;
```

### 3. Optimistic Updates

For better UX, use optimistic updates:

```typescript
const [updatePlan] = useUpdatePlanMutation();

const handleUpdate = async (updates) => {
  // Optimistically update UI
  dispatch(optimisticUpdate(updates));

  try {
    await updatePlan(updates).unwrap();
  } catch (error) {
    // Revert on error
    dispatch(revertUpdate());
  }
};
```

### 4. Polling and Refetching

For real-time data:

```typescript
// Poll every 30 seconds
const { data } = useGetMessagesQuery(chatId, {
  pollingInterval: 30000,
});

// Manual refetch
const { data, refetch } = useGetClientsQuery();
// Call refetch() when needed
```

## Adding New Services

To add a new service:

1. Create a new folder: `services/your-service/`

2. Create type definitions: `your-service_definition.ts`

```typescript
export interface YourModel {
  id: string;
  name: string;
  // ... other fields
}

export interface YourModelRequest {
  name: string;
  // ... request fields
}
```

3. Create API endpoints: `your-service.ts`

```typescript
import { baseAPISlice } from "../baseAPISlice";
import type { YourModel, YourModelRequest } from "./your-service_definition";

export const yourServiceApi = baseAPISlice.injectEndpoints({
  endpoints: (builder) => ({
    listYourModels: builder.query<YourModel[], void>({
      query: () => "/api/your-models",
    }),
    createYourModel: builder.mutation<YourModel, YourModelRequest>({
      query: (data) => ({
        url: "/api/your-models",
        method: "POST",
        data,
      }),
    }),
  }),
});

export const { useListYourModelsQuery, useCreateYourModelMutation } =
  yourServiceApi;
```

4. Create index file: `index.ts`

```typescript
export * from "./your-service";
export * from "./your-service_definition";
```

## Authentication Token Management

The base API slice handles authentication automatically:

```typescript
// Set token after login
import { setApiAuthToken } from "@/services/baseAPISlice";

const handleLogin = async (credentials) => {
  const { access_token } = await login(credentials);
  setApiAuthToken(access_token);
};

// Clear token on logout
const handleLogout = () => {
  setApiAuthToken(null);
};
```

## Environment Configuration

API base URL is configured in `.env`:

```env
VITE_API_BASE_URL=https://api.coacheasy.com
```

For local development, the base URL automatically resolves to the correct backend port.

## Common Patterns

### Pagination

```typescript
const { data, isLoading } = useListClientsQuery({
  page: currentPage,
  limit: pageSize,
});

// Response includes:
// data.records - array of items
// data.total - total count
// data.page - current page
// data.limit - items per page
```

### Search and Filters

```typescript
const { data } = useListPlansQuery({
  search: searchTerm,
  discipline: "workout",
  status: "active",
  sortBy: "created_at",
  sortOrder: "desc",
});
```

### File Uploads

```typescript
const [uploadFile] = useUploadFileMutation();

const handleFileUpload = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  const result = await uploadFile(formData).unwrap();
};
```

## Troubleshooting

### Issue: Query not refetching after mutation

**Solution**: Ensure proper cache tags are configured in both query and mutation endpoints.

### Issue: Authentication token not being sent

**Solution**: Check if `skipAuth` is not set to `true` and token is properly set using `setApiAuthToken`.

### Issue: CORS errors

**Solution**: Verify `withCredentials: true` is set in axios config and backend CORS settings are correct.

### Issue: Type errors in TypeScript

**Solution**: Ensure you're importing types from the correct `*_definition.ts` files.

## Support

For questions or issues related to services:

1. Check the specific service's `*_definition.ts` file for available types
2. Review the endpoint definitions in the service's main file
3. Consult the RTK Query documentation: https://redux-toolkit.js.org/rtk-query/overview
4. Contact the backend team for API-related issues

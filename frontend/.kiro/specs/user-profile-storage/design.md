# Design Document

## Overview

This design implements a user profile management system for the Coach Application that stores and provides access to authenticated user data. The solution introduces a new `UserProvider` context that works alongside the existing `AuthProvider` to manage user profile state. The design follows React context patterns already established in the codebase and integrates seamlessly with the cookie-based authentication system.

## Architecture

### Component Hierarchy

```
App
├── AppProvider (WebSocket management)
├── AuthProvider (Authentication state & token management)
│   └── UserProvider (User profile state management)
│       └── Application Routes & Components
```

### Data Flow

1. **Initial Load**: AuthProvider calls refresh endpoint → receives RefreshResponse with user data → passes to UserProvider → UserProvider stores and exposes user profile
2. **OTP Verification**: User verifies OTP → AuthProvider receives VerifyOTPResponse → extracts user data → passes to UserProvider
3. **Token Refresh**: AuthProvider refreshes token → receives RefreshResponse with updated user data → updates UserProvider
4. **Logout**: AuthProvider logout called → UserProvider clears user profile → state reset

### State Management Strategy

- **AuthProvider**: Manages authentication state (isAuthenticated, isAuthenticating, error) and token lifecycle
- **UserProvider**: Manages user profile data (User object with coach/client profiles)
- **Separation of Concerns**: Authentication state and user profile data are managed independently but synchronized through callbacks

## Components and Interfaces

### 1. UserProvider Component

**Location**: `easy-apps/apps/coachapp/src/providers/UserProvider.tsx`

**Purpose**: Manages user profile state and provides access throughout the application

**State Structure**:
```typescript
type UserState = {
  user: User | null;
  isLoading: boolean;
}
```

**Context Value**:
```typescript
type UserContextValue = {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  clearUser: () => void;
}
```

**Key Methods**:
- `setUser(user: User | null)`: Updates the current user profile
- `clearUser()`: Clears user profile (called on logout)

### 2. Enhanced AuthProvider

**Location**: `easy-apps/apps/coachapp/src/providers/AuthProvider.tsx`

**Changes Required**:
- Import and use `useUser` hook from UserProvider
- Extract user data from `RefreshResponse` in `verifyAuth` function
- Extract user data from `VerifyOTPResponse` in `saveAuthToken` function
- Call `setUser()` when user data is received
- Call `clearUser()` in logout function

**Modified Functions**:

```typescript
// verifyAuth function
const verifyAuth = useCallback(async (silent = false): Promise<AccessToken | null> => {
  // ... existing code ...
  
  try {
    const response = await refreshTokenTrigger().unwrap();
    
    // NEW: Extract and store user data
    if (response.user) {
      setUser(response.user);
    }
    
    // ... rest of existing code ...
  }
}, [refreshTokenTrigger, setUser]);

// saveAuthToken function  
const saveAuthToken = useCallback(async (verifyResponse: VerifyOTPResponse) => {
  // NEW: Extract and store user data
  if (verifyResponse.user) {
    setUser(verifyResponse.user);
  }
  
  // ... existing code ...
}, [setUser]);

// logout function
const logout = useCallback(async () => {
  try {
    await clearToken().unwrap();
    
    // NEW: Clear user profile
    clearUser();
    
    // ... existing code ...
  }
}, [clearToken, clearUser]);
```

### 3. Type Definitions

**Location**: `easy-apps/apps/coachapp/src/services/auth/auth_definition.ts`

**Existing Types** (already defined, no changes needed):
- `User`: Main user interface with id, email, full_name, email_verified, roles, and optional profile properties
- `CoachProfile`: Coach-specific profile data
- `ClientProfile`: Client-specific profile data
- `RefreshResponse`: Response from refresh endpoint
- `VerifyOTPResponse`: Response from verify-otp endpoint

### 4. useUser Hook

**Location**: `easy-apps/apps/coachapp/src/providers/UserProvider.tsx`

**Purpose**: Provides access to current user profile from any component

**Return Type**:
```typescript
{
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  clearUser: () => void;
}
```

**Usage Example**:
```typescript
function ProfileComponent() {
  const { user, isLoading } = useUser();
  
  if (isLoading) return <Spinner />;
  if (!user) return <div>Not authenticated</div>;
  
  return (
    <div>
      <h1>{user.full_name}</h1>
      <p>{user.email}</p>
      {user.coach_profile && (
        <div>
          <p>Business ID: {user.coach_profile.business_id}</p>
          <p>Status: {user.coach_profile.status}</p>
        </div>
      )}
    </div>
  );
}
```

## Data Models

### User Object Structure

```typescript
interface User {
  id: string;
  email: string;
  full_name: string;
  email_verified: boolean;
  roles: string[];
  coach_profile?: CoachProfile;
  client_profile?: ClientProfile;
}

interface CoachProfile {
  id: string;
  status: string;
  business_id: string | null;
  bio: string | null;
  specialties: string[];
  credentials: Record<string, unknown>;
}

interface ClientProfile {
  id: string;
  status: string;
  business_id: string | null;
  phone: string | null;
  notes: string | null;
}
```

### API Response Structures

**RefreshResponse** (from `/api/auth/refresh`):
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "User Name",
    "email_verified": true,
    "roles": ["coach"],
    "coach_profile": {
      "id": "uuid",
      "status": "active",
      "business_id": "uuid",
      "bio": null,
      "specialties": [],
      "credentials": {}
    }
  }
}
```

**VerifyOTPResponse** (from `/api/auth/verify-otp`):
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "User Name",
    "email_verified": true,
    "roles": ["coach"],
    "coach_profile": {
      "id": "uuid",
      "status": "active",
      "business_id": "uuid",
      "bio": null,
      "specialties": [],
      "credentials": {}
    }
  }
}
```

## Error Handling

### Scenarios and Responses

1. **Missing User Data in API Response**
   - Check if `response.user` exists before calling `setUser()`
   - Log warning if user data is missing
   - Continue with authentication flow (don't block)

2. **Invalid User Data Structure**
   - TypeScript types will catch structure mismatches at compile time
   - Runtime: If user data doesn't match expected structure, log error and set user to null

3. **User Context Used Outside Provider**
   - `useUser` hook throws error with message: "useUser must be used within a UserProvider"
   - Prevents silent failures from missing context

4. **Refresh Fails on Initial Load**
   - UserProvider remains in loading state briefly
   - Once AuthProvider sets `isAuthenticated: false`, UserProvider sets `isLoading: false` and `user: null`
   - Application shows login screen

## Testing Strategy

### Unit Tests

1. **UserProvider Tests**
   - Test initial state (user: null, isLoading: true)
   - Test setUser updates state correctly
   - Test clearUser resets state
   - Test useUser hook throws error outside provider

2. **AuthProvider Integration Tests**
   - Test verifyAuth calls setUser with user data from RefreshResponse
   - Test saveAuthToken calls setUser with user data from VerifyOTPResponse
   - Test logout calls clearUser
   - Test user data persists across re-renders

### Integration Tests

1. **Authentication Flow**
   - Test complete OTP verification flow stores user profile
   - Test token refresh updates user profile
   - Test logout clears user profile
   - Test initial load retrieves and stores user profile

2. **Component Integration**
   - Test components can access user data via useUser hook
   - Test components re-render when user data changes
   - Test protected routes have access to user profile

### Manual Testing Checklist

1. Login via OTP → verify user profile appears in React DevTools
2. Refresh page → verify user profile persists
3. Check profile component displays user name and email
4. Logout → verify user profile is cleared
5. Check coach-specific features access coach_profile data
6. Verify TypeScript compilation with no type errors

## Implementation Notes

### Provider Nesting Order

The UserProvider must be nested inside AuthProvider to access authentication state:

```typescript
<AppProvider>
  <AuthProvider>
    <UserProvider>
      <Router />
    </UserProvider>
  </AuthProvider>
</AppProvider>
```

### WebSocket Integration

The existing WebSocket initialization in AuthProvider's `verifyAuth` function should continue to work. The user profile data is separate from the WebSocket token, which is managed by cookies.

### Backward Compatibility

- Existing components continue to work without changes
- Components can gradually adopt `useUser` hook as needed
- No breaking changes to existing authentication flow

### Performance Considerations

- User profile stored in React context (minimal re-render impact)
- Only components using `useUser` hook will re-render on user data changes
- No additional API calls required (user data comes from existing auth endpoints)

### Future Enhancements

1. **Local Storage Persistence**: Store user profile in localStorage for faster initial loads
2. **Profile Update Endpoint**: Add ability to update user profile and sync with backend
3. **Role-Based Hooks**: Create `useCoachProfile()` and `useClientProfile()` convenience hooks
4. **Profile Validation**: Add runtime validation using Zod schemas for user data

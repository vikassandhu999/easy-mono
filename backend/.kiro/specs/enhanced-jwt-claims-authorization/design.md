# Design Document

## Overview

This design document outlines the architecture for enhancing the JWT claims structure and implementing a scope-based authorization system for the coaching platform. The design introduces fine-grained JWT claims with tenant context, a Scope struct for representing the current actor, and refactored authorization patterns that eliminate unnecessary database queries while making authorization decisions explicit and secure.

The key architectural changes include:

1. Enhanced JWT claims with business_id, coach_id, and client_id
2. A Scope struct representing the authenticated actor with their role context
3. Refactored service layer to accept scope as the first parameter
4. Updated Authorization module to work with scope objects
5. New authentication plug that constructs and injects scope into connections

## Architecture

### ID Format Handling

This system uses UUIDs throughout, but handles them in different formats depending on the layer:

**JWT Claims (String Format):**

- All IDs in JWT claims are UUID strings: `"550e8400-e29b-41d4-a716-446655440000"`
- This is the standard JWT format and what Joken produces
- Scope struct stores IDs as strings (no conversion needed from claims)

**Database Schema (Binary Format):**

- All ID columns use `:binary_id` type in Ecto schemas
- Ecto automatically converts between binary and string representations
- Queries accept UUID strings and Ecto handles conversion

**API Responses (String Format):**

- All IDs in JSON responses are UUID strings
- ResponseHelpers.format_uuid/1 ensures consistent string format
- Matches the format used in JWT claims

**Authorization Checks:**

- Scope-based checks compare UUID strings directly (from scope)
- Database queries accept UUID strings (Ecto converts to binary)
- No manual conversion needed in application code

### High-Level Flow

```
Request with JWT
    ↓
Authentication Plug
    ↓
Verify JWT & Extract Claims
    ↓
Construct Scope Struct
    ↓
Assign to conn.assigns.scope
    ↓
Controller Action
    ↓
Service Method (with scope)
    ↓
Authorization Check (using scope)
    ↓
Business Logic (scoped queries)
    ↓
Response
```

### Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     HTTP Request Layer                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  EasyWeb.Plugs.AuthenticateToken                     │  │
│  │  - Extracts Bearer token                             │  │
│  │  - Verifies JWT                                      │  │
│  │  - Constructs Scope                                  │  │
│  │  - Assigns to conn.assigns.scope                     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     Controller Layer                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Controllers (AuthController, CoachController, etc.) │  │
│  │  - Extract scope from conn.assigns.scope             │  │
│  │  - Pass scope to service methods                     │  │
│  │  - Handle authorization errors                       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      Service Layer                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Easy.Accounts, Easy.Organizations, Easy.Clients, etc.    │  │
│  │  - Accept scope as first parameter                   │  │
│  │  - Use scope for authorization decisions             │  │
│  │  - Apply business_id filters to queries              │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Authorization Layer                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  EasyWeb.Authorization                               │  │
│  │  - Scope-based permission checks                     │  │
│  │  - Business ownership verification                   │  │
│  │  - Coach/Client access control                       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Ecto Queries with business_id scoping               │  │
│  │  - Automatic tenant isolation                        │  │
│  │  - Query helpers for scope filtering                 │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Scope Struct (`Easy.Auth.Scope`)

The Scope struct represents the authenticated actor with their role context.

**Module:** `lib/easy/auth/scope.ex`

**Struct Definition:**

```elixir
defmodule Easy.Auth.Scope do
  @moduledoc """
  Represents the authenticated actor and their authorization context.

  The scope contains the user's identity and their active role context
  (business, coach, client) for the current session.

  All IDs are stored as UUID strings as extracted from JWT claims.
  """

  @enforce_keys [:user_id]
  defstruct [
    :user_id,        # UUID string - always present
    :business_id,    # UUID string - present if user has coach or client profile
    :coach_id,       # UUID string - present if user is acting as coach
    :client_id,      # UUID string - present if user is acting as client
    roles: []        # List of strings: ["coach"], ["client"], or ["coach", "client"]
  ]

  @type t :: %__MODULE__{
    user_id: String.t(),
    business_id: String.t() | nil,
    coach_id: String.t() | nil,
    client_id: String.t() | nil,
    roles: [String.t()]
  }
end
```

**Public Functions:**

- `from_claims(claims)` - Constructs a Scope from JWT claims, validates required fields
- `is_coach?(scope)` - Returns true if scope has "coach" in roles list
- `is_client?(scope)` - Returns true if scope has "client" in roles list
- `has_business_context?(scope)` - Returns true if scope has business_id
- `can_act_as_coach?(scope)` - Returns true if scope has coach_id (implies active coach profile)
- `can_act_as_client?(scope)` - Returns true if scope has client_id (implies active client profile)

**Design Rationale:**

The Scope struct uses UUID strings (not binary UUIDs) because:

1. JWT claims store IDs as strings
2. Avoids conversion overhead when constructing scope from claims
3. Simplifies comparison operations in authorization checks
4. Matches the format used in API responses

### 2. Enhanced Token Module (`Easy.Accounts.Token`)

The Token module has been enhanced to include tenant context in JWT claims.

**Module:** `lib/easy/accounts/token.ex`

**Status:** ✅ Already implemented (tasks 2.1-2.3 complete)

**Enhanced Claims Structure:**

```elixir
# Access Token Claims
%{
  "sub" => user_id,           # User UUID string
  "email" => email,           # User email
  "roles" => ["coach"],       # User roles list
  "jti" => session_id,        # Session UUID string
  "type" => "access",         # Token type
  "business_id" => business_id, # Business UUID string (optional)
  "coach_id" => coach_id,     # Coach UUID string (optional)
  "client_id" => client_id,   # Client UUID string (optional)
  "iat" => issued_at,         # Issued at timestamp (seconds)
  "exp" => expires_at,        # Expiration timestamp (seconds)
  "nonce" => nonce            # Unique nonce (UUID)
}

# Refresh Token Claims
%{
  "sub" => user_id,           # User UUID string
  "jti" => session_id,        # Session UUID string
  "type" => "refresh",        # Token type
  "business_id" => business_id, # Business UUID string (optional)
  "iat" => issued_at,         # Issued at timestamp (seconds)
  "exp" => expires_at,        # Expiration timestamp (seconds)
  "nonce" => nonce            # Unique nonce (UUID)
}
```

**Implemented Functions:**

- `generate_access_token(user, session_id, roles, business_context \\ %{})` - Generates access token with business context
- `generate_refresh_token(user, session_id, business_context \\ %{})` - Generates refresh token with business_id
- `extract_business_context(claims)` - Extracts business_id, coach_id, client_id from claims map
- `verify_token(token)` - Verifies JWT signature and expiration
- `get_user_id(claims)` - Extracts user_id from "sub" claim
- `get_session_id(claims)` - Extracts session_id from "jti" claim

**Design Rationale:**

The business_context parameter is optional (defaults to empty map) to support:

1. Users without any business profiles (new registrations)
2. Backward compatibility during migration
3. Gradual rollout of business context features

The `maybe_add_claim/3` helper ensures nil values are not added to claims, keeping tokens minimal.

### 3. Authentication Plug (`EasyWeb.Plugs.AuthenticateToken`)

A new plug that verifies JWT tokens and constructs the Scope struct.

**Module:** `lib/easy_web/plugs/authenticate_token.ex`

**Responsibilities:**

1. Extract Bearer token from Authorization header
2. Verify JWT signature and expiration
3. Extract claims from JWT
4. Construct Scope struct from claims
5. Assign scope to `conn.assigns.scope`
6. Handle authentication errors

**Public Functions:**

- `init(opts)` - Initialize plug with options
- `call(conn, opts)` - Main plug function

**Error Handling:**

- Missing token → 401 Unauthorized
- Invalid token → 401 Unauthorized
- Expired token → 401 Unauthorized
- Invalid claims → 401 Unauthorized

### 4. Refactored Authorization Module (`EasyWeb.Authorization`)

The Authorization module will be refactored to work with Scope objects instead of User objects.

**Module:** `lib/easy_web/authorization.ex`

**Current State:** The module currently uses User structs and performs database queries for authorization checks.

**New Function Signatures:**

```elixir
# Business Authorization
authorize_business_access(scope, business_id) :: :ok | {:error, :forbidden}
authorize_business_owner(scope, business_id) :: :ok | {:error, :forbidden}

# Coach Authorization
authorize_coach_access(scope, coach_id) :: :ok | {:error, :forbidden}
authorize_coach_in_business(scope) :: :ok | {:error, :forbidden}

# Client Authorization
authorize_client_access(scope, client_id) :: :ok | {:error, :forbidden}
authorize_client_in_business(scope) :: :ok | {:error, :forbidden}

# Cross-entity Authorization
authorize_coach_client_access(scope, client_id) :: :ok | {:error, :forbidden}
```

**Authorization Logic:**

1. **Business Access:** Verify scope.business_id matches requested business_id (no DB query)
2. **Business Owner:** Query business table to verify scope.user_id matches owner_id (requires DB lookup)
3. **Coach Access:** Verify scope.coach_id matches requested coach_id (no DB query)
4. **Client Access:** Verify scope.client_id matches requested client_id (no DB query)
5. **Coach-Client Access:** Verify scope.business_id is present and matches client's business (may require DB lookup to get client's business_id)

**Design Rationale:**

The scope-based approach eliminates most database queries for authorization:

- Identity checks (coach_id, client_id, business_id) use scope data directly
- Only ownership verification (business owner) requires database access
- Cross-entity checks may require one query to verify business_id match

**Migration Strategy:**

Existing functions like `user_belongs_to_business?/2`, `user_is_business_owner?/2`, etc. will be:

1. Kept temporarily for backward compatibility
2. Marked as deprecated
3. Gradually replaced by scope-based equivalents
4. Removed after all callers are updated

### 5. Session Creation with Business Context

The session creation flow is enhanced to determine and include business context.

**Module:** `lib/easy/accounts.ex`

**Enhanced Functions:**

```elixir
# Create session with automatic business context detection
create_session(user) :: {:ok, session_data} | {:error, reason}

# Create session with explicit business context
create_session(user, business_id) :: {:ok, session_data} | {:error, reason}

# Get available business contexts for user
get_user_business_contexts(user) :: [%{business_id: id, business_name: name, roles: [role], coach_id: id, client_id: id}]

# Switch business context (creates new session)
switch_business_context(scope, business_id) :: {:ok, session_data} | {:error, reason}

# Helper to determine business context from user profiles
determine_business_context(user) :: %{business_id: id, coach_id: id, client_id: id, roles: [role]} | nil
```

**Business Context Detection Logic:**

The `determine_business_context/1` function implements the following logic:

1. Query user's coach profiles (with business preloaded)
2. Query user's client profiles (with business preloaded)
3. If user has one coach profile → use that business_id, include coach_id, roles: ["coach"]
4. If user has one client profile → use that business_id, include client_id, roles: ["client"]
5. If user has both coach and client in same business → include both IDs, roles: ["coach", "client"]
6. If user has multiple profiles across different businesses → return nil (require explicit selection)
7. If user has no profiles → return nil (no business context)

**Design Rationale:**

Automatic context detection simplifies the login flow for users with a single business context, while requiring explicit selection for multi-business users ensures clarity and prevents accidental context switching.

### 6. Service Layer Refactoring

All service methods are refactored to accept scope as the first parameter.

**Pattern:**

```elixir
# Before
def get_coach(coach_id) do
  Repo.get(Coach, coach_id)
end

# After
def get_coach(scope, coach_id) do
  with :ok <- Authorization.authorize_coach_access(scope, coach_id) do
    Repo.get(Coach, coach_id)
  end
end
```

**Affected Modules:**

- `Easy.Accounts` - User management functions
- `Easy.Organizations` - Coach management functions
- `Easy.Clients` - Client management functions
- `Easy.Organizations` - Business management functions
- `Easy.Nutrition` - Nutrition-related functions (if they need business scoping)

**Query Scoping Pattern:**

```elixir
# Automatic business_id filtering
def list_clients(scope) do
  from(c in Client,
    where: c.business_id == ^scope.business_id
  )
  |> Repo.all()
end
```

### 7. Controller Integration

Controllers are updated to extract scope and pass it to service methods.

**Pattern:**

```elixir
def index(conn, _params) do
  scope = conn.assigns.scope

  case Coaches.list_coaches(scope) do
    {:ok, coaches} ->
      json(conn, %{coaches: coaches})

    {:error, :forbidden} ->
      conn
      |> put_status(:forbidden)
      |> json(%{error: "Access denied"})
  end
end
```

**Helper Functions:**

```elixir
# In EasyWeb module
def get_scope(conn) do
  case Map.get(conn.assigns, :scope) do
    nil -> {:error, :unauthorized}
    scope -> {:ok, scope}
  end
end

def require_scope(conn) do
  case get_scope(conn) do
    {:ok, scope} -> scope
    {:error, :unauthorized} ->
      conn
      |> put_status(:unauthorized)
      |> json(%{error: "Authentication required"})
      |> halt()
  end
end
```

### 8. Router Configuration

The router is updated to use the new authentication plug.

**Module:** `lib/easy_web/router.ex`

**Configuration:**

```elixir
pipeline :api do
  plug :accepts, ["json"]
end

pipeline :api_authenticated do
  plug :accepts, ["json"]
  plug EasyWeb.Plugs.AuthenticateToken
end

scope "/api", EasyWeb do
  pipe_through :api

  # Public authentication routes (no token required)
  post "/auth/register", AuthController, :register
  post "/auth/send-otp", AuthController, :send_otp
  post "/auth/verify-otp", AuthController, :verify_otp
  post "/auth/refresh", AuthController, :refresh
end

scope "/api", EasyWeb do
  pipe_through :api_authenticated

  # Authenticated routes (token required)
  post "/auth/logout", AuthController, :logout
  post "/auth/switch-context", AuthController, :switch_context
  get "/auth/contexts", AuthController, :list_contexts

  resources "/coaches", CoachController
  resources "/clients", ClientController
  resources "/businesses", BusinessController

  # Additional authenticated routes...
end
```

**Design Rationale:**

Separating public and authenticated pipelines ensures:

1. Authentication endpoints remain accessible without tokens
2. All other endpoints require valid authentication
3. Clear separation of concerns in routing
4. Easy to identify which routes are public vs protected

## Data Models

### Session Schema Enhancement

The Session schema is enhanced to store business_id for context preservation.

**Schema Changes:**

```elixir
schema "sessions" do
  field :token, :string
  field :refresh_token, :string
  field :expires_at, :utc_datetime
  field :last_activity_at, :utc_datetime
  field :revoked_at, :utc_datetime
  field :business_id, :binary_id  # NEW FIELD - stores UUID as binary

  belongs_to :user, Easy.Accounts.User, type: :binary_id

  timestamps()
end
```

**Migration:**

```elixir
defmodule Easy.Repo.Migrations.AddBusinessIdToSessions do
  use Ecto.Migration

  def change do
    alter table(:sessions) do
      add :business_id, :binary_id
    end

    create index(:sessions, [:business_id])
  end
end
```

**Design Rationale:**

The business_id field is nullable because:

1. Users without business profiles (new registrations) won't have a business context
2. Existing sessions created before this feature may not have business_id
3. Allows gradual migration without breaking existing sessions

The index on business_id supports:

1. Efficient queries to revoke all sessions for a business
2. Analytics on active sessions per business
3. Cleanup operations for deleted businesses

### No Other Schema Changes Required

The existing User, Coach, Client, and Business schemas remain unchanged. The business context is derived from these existing relationships through queries in the session creation logic.

## Error Handling

### Authentication Errors

**Error Types:**

- `missing_token` - No Authorization header present
- `invalid_token` - Token signature invalid or malformed
- `expired_token` - Token has expired
- `invalid_claims` - Token claims are malformed or missing required fields

**Response Format:**

```json
{
  "error": {
    "message": "Authentication failed",
    "code": "UNAUTHORIZED",
    "details": {
      "reason": "expired_token"
    }
  }
}
```

### Authorization Errors

**Error Types:**

- `forbidden` - User lacks permission for the requested action
- `business_mismatch` - Requested resource belongs to different business
- `missing_context` - Required business context not present in scope

**Response Format:**

```json
{
  "error": {
    "message": "Access denied",
    "code": "FORBIDDEN",
    "details": {
      "reason": "business_mismatch"
    }
  }
}
```

### Service Layer Error Handling

Service methods return tuples for error handling:

```elixir
{:ok, result} | {:error, :forbidden} | {:error, :not_found} | {:error, changeset}
```

Controllers handle these errors and convert them to appropriate HTTP responses.

## Testing Strategy

### Unit Tests

**Scope Module Tests:**

- Test scope construction from claims
- Test helper functions (is_coach?, is_client?, etc.)
- Test edge cases (missing fields, invalid data)

**Token Module Tests:**

- Test enhanced claim generation
- Test business context inclusion
- Test claim extraction
- Test token verification with new claims

**Authorization Module Tests:**

- Test scope-based authorization functions
- Test business access checks
- Test coach/client access checks
- Test cross-entity authorization

### Integration Tests

**Authentication Flow Tests:**

- Test login with business context selection
- Test token refresh with context preservation
- Test context switching
- Test multi-business user scenarios

**Authorization Flow Tests:**

- Test end-to-end request with scope
- Test unauthorized access attempts
- Test cross-tenant access prevention
- Test business owner special permissions

**Service Layer Tests:**

- Test service methods with scope parameter
- Test automatic query scoping
- Test authorization enforcement
- Test error handling

### Security Tests

**Tenant Isolation Tests:**

- Verify queries are scoped to business_id
- Test cross-tenant access prevention
- Test token tampering detection
- Test expired token rejection

**Authorization Tests:**

- Test permission boundaries
- Test role-based access control
- Test business owner privileges
- Test coach-client relationship enforcement

## Migration Plan

### Phase 1: Core Infrastructure (No Breaking Changes)

1. Create `Easy.Auth.Scope` module
2. Create `EasyWeb.Plugs.AuthenticateToken` plug
3. Enhance `Easy.Accounts.Token` with business context support
4. Add `business_id` field to sessions table
5. Update session creation to include business context

### Phase 2: Authorization Refactoring

1. Refactor `EasyWeb.Authorization` to use scope
2. Update authorization function signatures
3. Add scope-based authorization helpers
4. Update tests for authorization module

### Phase 3: Service Layer Refactoring

1. Update `Easy.Accounts` functions to accept scope
2. Update `Easy.Organizations` functions to accept scope
3. Update `Easy.Clients` functions to accept scope
4. Update `Easy.Organizations` functions to accept scope
5. Add query scoping helpers
6. Update all service layer tests

### Phase 4: Controller and Router Updates

1. Add authentication plug to router pipelines
2. Update all controllers to extract and use scope
3. Update controller tests
4. Add business context switching endpoints

### Phase 5: Testing and Validation

1. Run full test suite
2. Perform security audit
3. Test tenant isolation
4. Validate authorization enforcement
5. Performance testing

### Phase 6: Deployment

1. Deploy database migrations
2. Deploy application code
3. Monitor for errors
4. Validate production behavior

### 9. Response Formatting for Business Context

The ResponseHelpers module is enhanced to format business context in API responses.

**Module:** `lib/easy_web/controllers/response_helpers.ex`

**New Functions:**

```elixir
@doc """
Formats business context for JSON response.

Returns a map with business_id, coach_id, client_id, and roles.
Returns nil if no business context is available.
"""
@spec format_business_context(map() | nil) :: map() | nil
def format_business_context(nil), do: nil

def format_business_context(context) when is_map(context) do
  %{
    business_id: format_uuid(context[:business_id] || context.business_id),
    coach_id: format_uuid(context[:coach_id] || context.coach_id),
    client_id: format_uuid(context[:client_id] || context.client_id),
    roles: context[:roles] || context.roles || []
  }
end

@doc """
Formats available business contexts for JSON response.

Used when a user has multiple business contexts to choose from.
"""
@spec format_available_contexts([map()]) :: [map()]
def format_available_contexts(contexts) when is_list(contexts) do
  Enum.map(contexts, fn context ->
    %{
      business_id: format_uuid(context.business_id),
      business_name: context.business_name,
      roles: context.roles,
      coach_id: format_uuid(context[:coach_id]),
      client_id: format_uuid(context[:client_id])
    }
  end)
end
```

**Enhanced Session Formatting:**

```elixir
@doc """
Formats a session with business context for JSON response.
"""
@spec format_session_with_context(map(), map() | nil) :: map()
def format_session_with_context(session, context \\ nil) do
  base = format_session(session)

  if context do
    Map.put(base, :context, format_business_context(context))
  else
    base
  end
end
```

**Design Rationale:**

Consistent formatting of business context across all API responses:

1. Always includes all four fields (business_id, coach_id, client_id, roles)
2. Uses nil for missing IDs rather than omitting fields
3. Provides clear indication when no context is available (returns nil)
4. Supports both atom and string keys in input maps for flexibility

## Performance Considerations

### Benefits

1. **Reduced Database Queries:** Authorization decisions use scope data instead of querying user/coach/client tables
2. **Faster Authorization:** Business context is immediately available in JWT claims
3. **Efficient Query Scoping:** business_id filters are applied at query time, leveraging database indexes

### Potential Issues

1. **Larger JWT Tokens:** Additional claims increase token size (minimal impact, ~50-100 bytes)
2. **Token Refresh Overhead:** Need to query user profiles on refresh to update claims
3. **Stale Claims:** If user's roles change, tokens remain valid until expiration

### Optimizations

1. **Index Strategy:** Ensure business_id columns are indexed on all relevant tables
2. **Token Expiration:** Keep access token TTL reasonable (7 days) to limit stale claims
3. **Caching:** Consider caching user business contexts for token refresh operations

## Edge Cases and Error Scenarios

### User Profile Changes During Active Session

**Scenario:** User's coach or client profile is deleted while they have an active session.

**Handling:**

1. Access token remains valid until expiration (contains stale claims)
2. On token refresh, system detects missing profile and removes corresponding IDs from new token
3. If business context becomes completely invalid (no profiles in that business), refresh fails with error
4. User must re-authenticate to select a new business context

**Design Rationale:** This approach balances security with user experience. Short-lived access tokens (7 days) limit exposure to stale claims, while refresh validation ensures eventual consistency.

### Multi-Business User Login

**Scenario:** User has coach profiles in multiple businesses.

**Handling:**

1. `determine_business_context/1` returns nil (cannot auto-select)
2. Session is created without business context (business_id = nil in token)
3. Response includes `available_contexts` array with all options
4. User must call `/api/auth/switch-context` to select a business
5. New session is created with selected business context

**Design Rationale:** Explicit selection prevents confusion and ensures users are aware of which business they're operating in.

### User with Both Coach and Client Roles in Same Business

**Scenario:** User is both a coach and a client in the same business.

**Handling:**

1. Both coach_id and client_id are included in token claims
2. roles array contains both "coach" and "client"
3. Authorization checks respect both roles
4. User can access both coach and client features

**Design Rationale:** This supports scenarios where coaches also receive coaching from other coaches in the same business.

### New User Registration (No Business Context)

**Scenario:** User registers but hasn't created or joined any business yet.

**Handling:**

1. Session is created with business_id = nil
2. Token contains only user_id, email, and empty roles array
3. User can access profile endpoints but not business-scoped resources
4. Once user creates a business or accepts an invitation, they must refresh or re-login to get business context

**Design Rationale:** Allows users to complete registration and profile setup before joining a business.

### Business Owner Accessing Multiple Businesses

**Scenario:** User owns multiple businesses.

**Handling:**

1. Each business is treated as a separate context
2. User must switch contexts to access different businesses
3. Business ownership is verified via database query (not in token)
4. Owner privileges are checked in addition to scope-based authorization

**Design Rationale:** Separates identity (ownership) from active context, allowing clear audit trails and preventing accidental cross-business operations.

### Token Expiration During Long-Running Operations

**Scenario:** Access token expires while user is actively using the application.

**Handling:**

1. Client receives 401 Unauthorized response
2. Client automatically attempts token refresh using refresh token
3. If refresh succeeds, operation is retried with new access token
4. If refresh fails, user is redirected to login

**Design Rationale:** This is standard OAuth2 flow and should be handled by the client application.

### Concurrent Context Switches

**Scenario:** User switches business context in multiple browser tabs simultaneously.

**Handling:**

1. Each context switch creates a new session
2. Old sessions remain valid until their tokens expire
3. Each tab operates independently with its own session
4. No session invalidation on context switch (by design)

**Design Rationale:** Allows users to work with multiple businesses simultaneously in different tabs. If this is undesirable, implement session revocation on context switch.

## Security Considerations

### Token Security

1. **Claim Validation:** Always validate all claims are present and properly formatted
2. **Signature Verification:** Use strong secret keys and verify signatures on every request
3. **Expiration Enforcement:** Strictly enforce token expiration times
4. **Nonce Usage:** Include nonce in claims to prevent token replay attacks

### Tenant Isolation

1. **Query Scoping:** Always filter queries by business_id from scope
2. **Authorization Checks:** Verify business_id matches before any data access
3. **Cross-Tenant Prevention:** Reject requests that attempt to access other tenants' data
4. **Owner Privileges:** Carefully control business owner special permissions

### Audit and Monitoring

1. **Authorization Failures:** Log all authorization failures for security monitoring
2. **Context Switches:** Log business context switches for audit trail
3. **Token Refresh:** Monitor token refresh patterns for anomalies
4. **Failed Authentications:** Track failed authentication attempts

## API Changes

### New Endpoints

**POST /api/auth/switch-context**

Switches the user's active business context by creating a new session with the specified business_id.

```json
Request:
{
  "business_id": "550e8400-e29b-41d4-a716-446655440000"
}

Response (200 OK):
{
  "session": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_at": "2024-01-08T12:00:00Z",
    "expires_in": 604800
  },
  "context": {
    "business_id": "550e8400-e29b-41d4-a716-446655440000",
    "coach_id": "660e8400-e29b-41d4-a716-446655440001",
    "client_id": null,
    "roles": ["coach"]
  }
}

Error Response (403 Forbidden):
{
  "error": {
    "message": "Access denied",
    "code": "FORBIDDEN",
    "details": {
      "reason": "business_not_accessible"
    }
  }
}
```

**GET /api/auth/contexts**

Lists all available business contexts for the authenticated user.

```json
Response (200 OK):
{
  "contexts": [
    {
      "business_id": "550e8400-e29b-41d4-a716-446655440000",
      "business_name": "Acme Coaching",
      "roles": ["coach"],
      "coach_id": "660e8400-e29b-41d4-a716-446655440001",
      "client_id": null
    },
    {
      "business_id": "770e8400-e29b-41d4-a716-446655440002",
      "business_name": "Beta Fitness",
      "roles": ["client"],
      "coach_id": null,
      "client_id": "880e8400-e29b-41d4-a716-446655440003"
    },
    {
      "business_id": "990e8400-e29b-41d4-a716-446655440004",
      "business_name": "Gamma Wellness",
      "roles": ["coach", "client"],
      "coach_id": "aa0e8400-e29b-41d4-a716-446655440005",
      "client_id": "bb0e8400-e29b-41d4-a716-446655440006"
    }
  ]
}
```

### Modified Endpoints

**POST /api/auth/verify-otp**

Enhanced response includes business context when available:

```json
Response (200 OK):
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "coach@example.com",
    "full_name": "John Doe",
    "email_verified": true,
    "email_verified_at": "2024-01-01T10:00:00Z",
    "created_at": "2024-01-01T10:00:00Z",
    "updated_at": "2024-01-01T10:00:00Z"
  },
  "session": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_at": "2024-01-08T12:00:00Z",
    "expires_in": 604800
  },
  "context": {
    "business_id": "660e8400-e29b-41d4-a716-446655440001",
    "coach_id": "770e8400-e29b-41d4-a716-446655440002",
    "client_id": null,
    "roles": ["coach"]
  }
}

Response for user with no business context (new user):
{
  "user": {...},
  "session": {...},
  "context": null
}

Response for user with multiple business contexts:
{
  "user": {...},
  "session": {...},
  "context": null,
  "available_contexts": [
    {
      "business_id": "...",
      "business_name": "Acme Coaching",
      "roles": ["coach"]
    },
    {
      "business_id": "...",
      "business_name": "Beta Fitness",
      "roles": ["client"]
    }
  ],
  "message": "Multiple business contexts available. Please select one using /api/auth/switch-context"
}
```

**POST /api/auth/refresh**

Enhanced to preserve and update business context:

```json
Request:
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

Response (200 OK):
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_at": "2024-01-08T12:00:00Z",
  "expires_in": 604800,
  "context": {
    "business_id": "550e8400-e29b-41d4-a716-446655440000",
    "coach_id": "660e8400-e29b-41d4-a716-446655440001",
    "client_id": null,
    "roles": ["coach"]
  }
}

Error Response (401 Unauthorized) - Profile deleted:
{
  "error": {
    "message": "Business context no longer valid",
    "code": "INVALID_CONTEXT",
    "details": {
      "reason": "profile_deleted",
      "message": "Your profile in this business has been removed. Please re-authenticate."
    }
  }
}
```

## Implementation Status

### Completed Components

✅ **Token Module Enhancement (Tasks 2.1-2.3)**

- `generate_access_token/4` accepts business_context parameter
- `generate_refresh_token/3` accepts business_context parameter
- `extract_business_context/1` extracts context from claims
- All token functions properly handle optional business context

### Remaining Implementation

The following components need to be implemented according to the tasks list:

1. **Scope Module** - Core data structure for authorization context
2. **Authentication Plug** - JWT verification and scope construction
3. **Session Schema Migration** - Add business_id column
4. **Business Context Detection** - Automatic context selection logic
5. **Token Refresh Enhancement** - Context preservation and validation
6. **Authorization Module Refactoring** - Scope-based authorization functions
7. **Service Layer Refactoring** - Accept scope as first parameter
8. **Controller Updates** - Extract and use scope from conn.assigns
9. **Router Configuration** - Apply authentication plug to protected routes
10. **Context Switching Endpoints** - API for switching business context
11. **Response Formatting** - Include business context in responses
12. **Query Helpers** - Automatic business_id scoping utilities

## Conclusion

This design provides a comprehensive approach to enhancing the JWT claims structure and implementing scope-based authorization. The key benefits include:

1. **Explicit Authorization:** Scope makes authorization context clear and testable
2. **Improved Performance:** Reduced database queries for authorization decisions (most checks use scope data directly)
3. **Better Security:** Tenant isolation enforced at multiple layers (JWT claims, authorization checks, query scoping)
4. **Developer Experience:** Clear patterns for authorization in service methods with consistent scope parameter
5. **Scalability:** Efficient query scoping supports multi-tenant growth without performance degradation
6. **Flexibility:** Supports users with multiple business contexts and dual roles (coach + client)

The implementation follows Phoenix and Elixir best practices:

- Pattern matching for scope validation and authorization checks
- `with` clauses for explicit error handling
- Immutable data structures (Scope struct)
- Clear separation of concerns (authentication, authorization, business logic)
- Ecto query composition for efficient database access

The phased migration plan ensures backward compatibility during rollout, with the Token module already enhanced to support the new claims structure.

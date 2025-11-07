# Design Document

## Overview

This design document outlines the technical approach for refining the coaching platform APIs to use UUIDs, simplify authentication flows, and streamline multi-step user journeys. The design focuses on three main areas:

1. **Database Migration**: Migrating all primary and foreign keys from integers to UUIDs
2. **Authentication Simplification**: Replacing OAuth endpoints with simple REST endpoints
3. **Flow Optimization**: Reducing API chattiness in coach registration and client invitation flows

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Applications                      │
│                  (Web, Mobile, Desktop)                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ HTTPS/JSON
                         │
┌────────────────────────▼────────────────────────────────────┐
│                    API Layer (Phoenix)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Auth         │  │ Onboarding   │  │ Client       │     │
│  │ Controller   │  │ Controller   │  │ Controller   │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │              │
│  ┌──────▼──────────────────▼──────────────────▼───────┐    │
│  │           Context Layer (Business Logic)           │    │
│  │  Accounts │ Coaches │ Clients │ Organizations     │    │
│  └──────┬──────────────────────────────────────┬──────┘    │
└─────────┼──────────────────────────────────────┼───────────┘
          │                                       │
          │                                       │
┌─────────▼───────────────────────────────────────▼───────────┐
│                  Database (PostgreSQL)                       │
│  UUID-based tables: users, sessions, one_time_tokens,       │
│  businesses, coaches, clients, coach_client_assignments     │
└──────────────────────────────────────────────────────────────┘
```

### Migration Strategy

The migration from integer IDs to UUIDs will follow a phased approach:

**Phase 1: Add UUID Columns**

- Add `uuid` column to each table alongside existing `id` column
- Add `*_uuid` columns for foreign keys alongside existing `*_id` columns
- Generate UUIDs for all existing records
- Create indexes on UUID columns

**Phase 2: Update Application Code**

- Update Ecto schemas to use `:binary_id` as primary key type
- Update all foreign key references to use UUID types
- Update API responses to return UUIDs
- Update API request handlers to accept UUIDs

**Phase 3: Remove Integer Columns**

- Drop foreign key constraints on integer columns
- Drop integer ID columns
- Rename UUID columns to standard names (uuid → id)
- Update constraints and indexes

## Components and Interfaces

### 1. Database Schema Changes

#### Users Table

```sql
-- Before
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  email_verified_at TIMESTAMP,
  inserted_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

-- After
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  email_verified_at TIMESTAMP,
  inserted_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);
```

#### OneTimeTokens Table

```sql
-- After
CREATE TABLE one_time_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token UUID NOT NULL UNIQUE,  -- Used for invitation links
  code VARCHAR(255) NOT NULL,  -- Hashed OTP code
  type VARCHAR(50) NOT NULL,   -- email_verification, login, client_invitation
  email VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  attempts INTEGER DEFAULT 0,
  metadata JSONB,
  user_id UUID REFERENCES users(id),
  inserted_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_one_time_tokens_token ON one_time_tokens(token);
CREATE INDEX idx_one_time_tokens_email_type ON one_time_tokens(email, type);
```

#### Sessions Table

```sql
-- After
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,  -- JWT access token
  refresh_token TEXT NOT NULL UNIQUE,  -- JWT refresh token
  expires_at TIMESTAMP NOT NULL,
  last_activity_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP,
  user_id UUID NOT NULL REFERENCES users(id),
  inserted_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
```

#### Businesses Table

```sql
-- After
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  slug VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  owner_id UUID NOT NULL REFERENCES users(id),
  inserted_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);
```

#### Coaches Table

```sql
-- After
CREATE TABLE coaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bio TEXT,
  specialties TEXT[],
  credentials JSONB,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  user_id UUID NOT NULL REFERENCES users(id),
  business_id UUID NOT NULL REFERENCES businesses(id),
  inserted_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  UNIQUE(user_id, business_id)
);
```

#### Clients Table

```sql
-- After
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  notes TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  user_id UUID REFERENCES users(id),
  business_id UUID NOT NULL REFERENCES businesses(id),
  inserted_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  UNIQUE(user_id, business_id)
);

CREATE INDEX idx_clients_email_business ON clients(email, business_id);
```

#### CoachClientAssignments Table

```sql
-- After
CREATE TABLE coach_client_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP NOT NULL,
  assigned_by_id UUID REFERENCES users(id),
  inserted_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  UNIQUE(coach_id, client_id)
);
```

### 2. Ecto Schema Updates

All schemas will be updated to use `:binary_id` as the primary key type:

```elixir
# Example: User schema
defmodule Easy.Accounts.User do
  use Ecto.Schema

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "users" do
    field :email, :string
    field :full_name, :string
    # ... other fields

    has_one :coach, Easy.Coaches.Coach
    has_one :client, Easy.Clients.Client
    has_many :sessions, Easy.Accounts.Session

    timestamps()
  end
end
```

### 3. Simplified Authentication API

#### New Authentication Endpoints

**POST /api/auth/send-otp**

```json
// Request
{
  "email": "user@example.com",
  "type": "login"  // or "registration"
}

// Response (201 Created)
{
  "token_id": "550e8400-e29b-41d4-a716-446655440000",
  "expires_at": "2024-01-01T12:15:00Z",
  "status": "pending"
}

// Error Response (429 Too Many Requests)
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many OTP requests. Please try again later.",
    "retry_after": 300
  }
}
```

**POST /api/auth/verify-otp**

```json
// Request
{
  "token_id": "550e8400-e29b-41d4-a716-446655440000",
  "code": "123456"
}

// Response (200 OK)
{
  "user": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "email": "user@example.com",
    "full_name": "John Doe",
    "email_verified": true,
    "roles": ["coach"],
    "coach_profile": {
      "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "business_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
      "status": "active"
    }
  },
  "session": {
    "access_token": "eyJhbGc...",
    "refresh_token": "eyJhbGc...",
    "expires_at": "2024-01-08T12:00:00Z",
    "expires_in": 604800
  }
}

// Error Response (400 Bad Request)
{
  "error": {
    "code": "INVALID_OTP",
    "message": "The provided code is invalid or has expired",
    "attempts_remaining": 2
  }
}
```

**POST /api/auth/refresh**

```json
// Request
{
  "refresh_token": "eyJhbGc..."
}

// Response (200 OK)
{
  "access_token": "eyJhbGc...",
  "expires_at": "2024-01-08T12:00:00Z",
  "expires_in": 604800
}

// Error Response (401 Unauthorized)
{
  "error": {
    "code": "INVALID_REFRESH_TOKEN",
    "message": "The refresh token is invalid or has expired"
  }
}
```

**POST /api/auth/logout**

```json
// Request (with Authorization: Bearer <token> header)
{}

// Response (200 OK)
{
  "status": "logged_out"
}
```

### 4. Streamlined Coach Registration Flow

The coach registration flow is reduced to 3 API calls:

**Step 1: Register (POST /api/auth/register)**

```json
// Request
{
  "email": "coach@example.com",
  "full_name": "John Coach"
}

// Response (201 Created)
{
  "token_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "verification_pending",
  "expires_at": "2024-01-01T12:10:00Z"
}
```

**Step 2: Verify OTP (POST /api/auth/verify-otp)**

```json
// Request
{
  "token_id": "550e8400-e29b-41d4-a716-446655440000",
  "code": "123456"
}

// Response (200 OK)
{
  "user": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "email": "coach@example.com",
    "full_name": "John Coach",
    "email_verified": true,
    "roles": []
  },
  "session": {
    "access_token": "eyJhbGc...",
    "refresh_token": "eyJhbGc...",
    "expires_at": "2024-01-08T12:00:00Z",
    "expires_in": 604800
  }
}
```

**Step 3: Create Business (POST /api/onboarding/business)**

```json
// Request (with Authorization: Bearer <token> header)
{
  "name": "Coaching Pro",
  "description": "Professional coaching services"
}

// Response (201 Created)
{
  "business": {
    "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
    "name": "Coaching Pro",
    "slug": "coaching-pro",
    "description": "Professional coaching services",
    "owner_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "status": "active",
    "created_at": "2024-01-01T12:00:00Z"
  },
  "coach_profile": {
    "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "business_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
    "status": "active",
    "bio": null,
    "specialties": [],
    "credentials": {}
  },
  "subscription": {
    "id": "d4e5f6a7-b8c9-0123-def0-123456789012",
    "business_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
    "plan_id": "e5f6a7b8-c9d0-1234-ef01-234567890123",
    "status": "active",
    "plan": {
      "name": "Free",
      "slug": "free",
      "price_cents": 0
    }
  }
}
```

### 5. Streamlined Client Invitation Flow

The client invitation flow is reduced to 3 API calls from the client's perspective:

**Step 1: Coach Creates Invitation (POST /api/clients/invite)**

```json
// Request (with Authorization: Bearer <token> header)
{
  "email": "client@example.com",
  "full_name": "Jane Client",
  "phone": "+1234567890",
  "notes": "New client from referral"
}

// Response (201 Created)
{
  "client": {
    "id": "f6a7b8c9-d0e1-2345-f012-345678901234",
    "email": "client@example.com",
    "full_name": "Jane Client",
    "phone": "+1234567890",
    "status": "pending",
    "business_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
    "notes": "New client from referral"
  },
  "invitation": {
    "token_id": "a7b8c9d0-e1f2-3456-0123-456789012345",
    "invitation_url": "https://app.example.com/invite/a7b8c9d0-e1f2-3456-0123-456789012345",
    "expires_at": "2024-01-08T12:00:00Z"
  }
}
```

**Step 2: Client Views Invitation (GET /api/invitations/:token_id)**

```json
// Response (200 OK)
{
  "invitation": {
    "token_id": "a7b8c9d0-e1f2-3456-0123-456789012345",
    "status": "valid",
    "expires_at": "2024-01-08T12:00:00Z"
  },
  "client": {
    "email": "client@example.com",
    "full_name": "Jane Client"
  },
  "business": {
    "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
    "name": "Coaching Pro"
  },
  "inviting_coach": {
    "full_name": "John Coach"
  }
}
```

**Step 3: Client Accepts Invitation (POST /api/invitations/:token_id/accept)**

```json
// Request
{
  "code": "123456"
}

// Response (200 OK)
{
  "user": {
    "id": "b8c9d0e1-f2a3-4567-1234-567890123456",
    "email": "client@example.com",
    "full_name": "Jane Client",
    "email_verified": true,
    "roles": ["client"],
    "client_profile": {
      "id": "f6a7b8c9-d0e1-2345-f012-345678901234",
      "business_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
      "status": "active",
      "assigned_coaches": [
        {
          "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
          "user": {
            "full_name": "John Coach"
          }
        }
      ]
    }
  },
  "session": {
    "access_token": "eyJhbGc...",
    "refresh_token": "eyJhbGc...",
    "expires_at": "2024-01-08T12:00:00Z",
    "expires_in": 604800
  }
}
```

Note: The accept endpoint now combines the previous "accept" (which sent OTP) and "complete" (which verified OTP) into a single step. The OTP is sent when the coach creates the invitation, and the client provides it when accepting.

## Data Models

### OneTimeToken Model

```elixir
defmodule Easy.Accounts.OneTimeToken do
  use Ecto.Schema

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "one_time_tokens" do
    field :token, :binary_id  # UUID for invitation links
    field :code, :string      # Hashed OTP code
    field :type, :string      # email_verification, login, client_invitation
    field :email, :string
    field :expires_at, :utc_datetime
    field :used_at, :utc_datetime
    field :attempts, :integer, default: 0
    field :metadata, :map

    belongs_to :user, Easy.Accounts.User

    timestamps()
  end

  # Token types
  @types ~w(email_verification login client_invitation)

  # Validation functions
  def expired?(%__MODULE__{expires_at: expires_at}), do: DateTime.compare(DateTime.utc_now(), expires_at) != :lt
  def used?(%__MODULE__{used_at: used_at}), do: not is_nil(used_at)
  def verify_code(%__MODULE__{code: hashed}, code), do: Bcrypt.verify_pass(code, hashed)
end
```

### Session Model

```elixir
defmodule Easy.Accounts.Session do
  use Ecto.Schema

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "sessions" do
    field :token, :string           # JWT access token
    field :refresh_token, :string   # JWT refresh token
    field :expires_at, :utc_datetime
    field :last_activity_at, :utc_datetime
    field :revoked_at, :utc_datetime

    belongs_to :user, Easy.Accounts.User

    timestamps()
  end

  def valid?(%__MODULE__{} = session) do
    not expired?(session) and not revoked?(session)
  end

  def expired?(%__MODULE__{expires_at: expires_at}), do: DateTime.compare(DateTime.utc_now(), expires_at) != :lt
  def revoked?(%__MODULE__{revoked_at: revoked_at}), do: not is_nil(revoked_at)
end
```

## Error Handling

### Standard Error Response Format

All error responses will follow this consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional context"
    }
  }
}
```

### Error Codes

| Code                       | HTTP Status | Description                    |
| -------------------------- | ----------- | ------------------------------ |
| VALIDATION_ERROR           | 422         | Request validation failed      |
| INVALID_OTP                | 400         | OTP code is incorrect          |
| TOKEN_EXPIRED              | 410         | Token has expired              |
| TOKEN_USED                 | 410         | Token has already been used    |
| TOKEN_NOT_FOUND            | 404         | Token does not exist           |
| MAX_ATTEMPTS_EXCEEDED      | 429         | Too many verification attempts |
| RATE_LIMIT_EXCEEDED        | 429         | Too many requests              |
| INVALID_REFRESH_TOKEN      | 401         | Refresh token is invalid       |
| SESSION_NOT_FOUND          | 401         | Session does not exist         |
| UNAUTHORIZED               | 401         | Authentication required        |
| FORBIDDEN                  | 403         | Insufficient permissions       |
| NOT_FOUND                  | 404         | Resource not found             |
| BUSINESS_EXISTS            | 422         | User already owns a business   |
| INVITATION_EXPIRED         | 410         | Invitation has expired         |
| INVITATION_USED            | 410         | Invitation already accepted    |
| INVALID_TOKEN_TYPE         | 400         | Token type mismatch            |
| METADATA_VALIDATION_FAILED | 400         | Token metadata is invalid      |

### Error Handling Strategy

1. **Client Errors (4xx)**: Return specific error codes with actionable messages
2. **Server Errors (5xx)**: Log detailed error information, return generic message to client
3. **Validation Errors**: Include field-level details in the `details` object
4. **Rate Limiting**: Include `retry_after` in details and set `Retry-After` header
5. **Security**: Never expose whether users exist in error messages

## Testing Strategy

### Unit Tests

1. **Schema Tests**

   - UUID generation and validation
   - Foreign key relationships with UUIDs
   - Changeset validations

2. **Context Tests**

   - OTP generation with token_id return
   - OTP verification with token_id input
   - Session creation and refresh
   - Token type validation
   - Metadata validation

3. **Controller Tests**
   - Request/response format validation
   - Error response consistency
   - Authentication flow completeness

### Integration Tests

1. **Coach Registration Flow**

   - Complete flow from registration to business creation
   - Verify 3 API calls complete the flow
   - Verify response includes all necessary data

2. **Client Invitation Flow**

   - Complete flow from invitation to client activation
   - Verify automatic coach assignment
   - Verify response includes complete profile data

3. **Authentication Flow**
   - OTP send, verify, and session creation
   - Token refresh
   - Session revocation

### Migration Tests

1. **Data Integrity**

   - Verify all records migrated successfully
   - Verify foreign key relationships maintained
   - Verify no data loss

2. **Rollback Tests**
   - Verify migrations can be rolled back safely
   - Verify data consistency after rollback

## Implementation Considerations

### UUID Performance

- UUIDs are 128-bit (16 bytes) vs integers (8 bytes for BIGINT)
- Index size will increase by ~2x
- Query performance impact is minimal for typical workloads
- Use `gen_random_uuid()` for better randomness than sequential UUIDs

### Token Security

- OTP codes are hashed using bcrypt before storage
- Token UUIDs are cryptographically random
- Rate limiting prevents brute force attacks
- Tokens expire after configured time periods
- Used tokens are marked and cannot be reused

### API Versioning

- Current endpoints will be deprecated but maintained for backward compatibility
- New endpoints will be the default
- OAuth endpoints will be marked as deprecated
- Migration guide will be provided for API consumers

### Database Indexes

Critical indexes for UUID-based queries:

```sql
-- OneTimeTokens
CREATE INDEX idx_one_time_tokens_token ON one_time_tokens(token);
CREATE INDEX idx_one_time_tokens_email_type ON one_time_tokens(email, type);
CREATE INDEX idx_one_time_tokens_expires_at ON one_time_tokens(expires_at);

-- Sessions
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_refresh_token ON sessions(refresh_token);

-- Coaches
CREATE INDEX idx_coaches_user_id ON coaches(user_id);
CREATE INDEX idx_coaches_business_id ON coaches(business_id);

-- Clients
CREATE INDEX idx_clients_user_id ON clients(user_id);
CREATE INDEX idx_clients_business_id ON clients(business_id);
CREATE INDEX idx_clients_email_business ON clients(email, business_id);

-- CoachClientAssignments
CREATE INDEX idx_coach_client_assignments_coach_id ON coach_client_assignments(coach_id);
CREATE INDEX idx_coach_client_assignments_client_id ON coach_client_assignments(client_id);
```

### Configuration

New configuration options in `config/config.exs`:

```elixir
config :easy, :auth,
  # OTP settings
  otp_expiry_minutes: 10,
  otp_max_attempts: 3,

  # Invitation settings
  invitation_expiry_days: 7,

  # Rate limiting
  rate_limit_window_minutes: 15,
  rate_limit_max_requests: 3,

  # Session settings
  session_expiry_days: 7,

  # Cleanup settings
  cleanup_old_sessions_older_than_days: 90,
  cleanup_expired_tokens_older_than_days: 7

config :easy, :jwt,
  access_token_ttl_days: 7,
  refresh_token_ttl_days: 30,
  secret_key: System.get_env("JWT_SECRET_KEY")
```

### Idempotency Implementation

To prevent duplicate operations from network retries:

1. **OTP Generation**: Check for existing valid tokens within 60 seconds
2. **Business Creation**: Check if user already owns a business
3. **Client Invitation**: Check for existing pending invitation for same email/business
4. **Session Creation**: Allow multiple active sessions per user

```elixir
# Example: Idempotent OTP generation
def generate_otp_idempotent(email, type, metadata \\ %{}) do
  # Check for recent token (within 60 seconds)
  recent_token = get_recent_token(email, type, 60)

  case recent_token do
    nil -> generate_otp(email, type, metadata)
    token -> {:ok, token.token}  # Return existing token
  end
end
```

## Migration Execution Plan

### Direct Migration File Updates

Since the database migrations have not been run in production yet, we will **update the existing migration files directly** rather than creating new migrations. This approach is simpler and avoids the complexity of a phased migration.

**Important**: This approach is only valid because:
1. The database is in development/staging only
2. No production data exists yet
3. We can reset the database without data loss

### Migration Update Strategy

1. **Update all existing migration files** in `priv/repo/migrations/` to use UUID types
2. **Reset the database** to apply the updated migrations
3. **Update all Ecto schemas** to use `:binary_id` types
4. **Update all API code** to work with UUIDs

### Updated Migration Files

Each migration file will be updated to use `uuid` type instead of `bigserial`:

```elixir
# Example: priv/repo/migrations/20251106052345_create_users.exs
defmodule Easy.Repo.Migrations.CreateUsers do
  use Ecto.Migration

  def change do
    create table(:users, primary_key: false) do
      add :id, :uuid, primary_key: true, default: fragment("gen_random_uuid()")
      add :email, :string, null: false
      add :full_name, :string, null: false
      add :email_verified, :boolean, default: false
      add :email_verified_at, :utc_datetime

      timestamps()
    end

    create unique_index(:users, [:email])
  end
end
```

```elixir
# Example: priv/repo/migrations/20251106052354_create_one_time_tokens.exs
defmodule Easy.Repo.Migrations.CreateOneTimeTokens do
  use Ecto.Migration

  def change do
    create table(:one_time_tokens, primary_key: false) do
      add :id, :uuid, primary_key: true, default: fragment("gen_random_uuid()")
      add :token, :uuid, null: false
      add :code, :string, null: false
      add :type, :string, null: false
      add :email, :string, null: false
      add :expires_at, :utc_datetime, null: false
      add :used_at, :utc_datetime
      add :attempts, :integer, default: 0
      add :metadata, :map
      add :user_id, references(:users, type: :uuid, on_delete: :nothing)

      timestamps()
    end

    create unique_index(:one_time_tokens, [:token])
    create index(:one_time_tokens, [:email, :type])
    create index(:one_time_tokens, [:user_id])
  end
end
```

### Database Reset Process

```bash
# Drop the database
mix ecto.drop

# Create the database
mix ecto.create

# Run all migrations (now with UUID types)
mix ecto.migrate

# Run seeds if needed
mix run priv/repo/seeds.exs
```

### Rollback Plan

If issues are discovered after updating migrations:

1. **Revert migration files** to original integer-based versions
2. **Reset database** with `mix ecto.reset`
3. **Revert schema changes** in application code

Since this is pre-production, the rollback is straightforward and doesn't involve data migration.

## Summary

This design provides a comprehensive approach to refining the coaching platform APIs with:

1. **UUID Migration**: All entities use UUIDs for better security and scalability
2. **Simplified Authentication**: Removed OAuth complexity in favor of simple REST endpoints
3. **Streamlined Flows**: Reduced API calls for coach registration and client invitation
4. **Explicit Token References**: All authentication flows use token_id for clarity
5. **Consistent Responses**: Standardized error handling and response formats
6. **Idempotency**: Critical operations handle network retries gracefully

The implementation will be done in phases to minimize risk and allow for rollback if needed.

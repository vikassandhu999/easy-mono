# Code Organization Rules

This document defines where different types of functions should live in the codebase.

## 1. Schema Files (`lib/easy/identity/*.ex`)

**Location:** `lib/easy/identity/user.ex`, `lib/easy/identity/one_time_token.ex`, etc.

**What belongs here:**
- ✅ Ecto schema definition
- ✅ Changesets (`changeset/2`, `create_changeset/2`, `update_changeset/2`)
- ✅ Schema-specific query functions
- ✅ Simple struct helper functions
- ❌ NO business logic
- ❌ NO external service calls (email, SMS)
- ❌ NO transaction management

**Examples:**
```elixir
# Changesets
def registration_changeset(user, attrs)
def update_changeset(user, attrs)

# Queries
def get_by_email(email)
def find_recent_auth_token(email, phone)
def get_active_sessions_for_user(user_id)

# Helpers
def email_confirmed?(user)
def expired?(token)
def active?(session)
```

---

## 2. Context Modules (`lib/easy/*.ex`)

**Location:** `lib/easy/identity.ex`, `lib/easy/tenant.ex`, etc.

**What belongs here:**
- ✅ Public API for the domain
- ✅ Business logic orchestration
- ✅ Multi-schema operations
- ✅ Transaction management
- ✅ Calling external services (via Notifications module)
- ✅ Authentication flows
- ❌ NO HTTP/request handling
- ❌ NO parameter parsing

**Examples:**
```elixir
# Public APIs
def request_otp(email: email)
def verify_otp_and_authenticate(token_id, otp, device_info)
def create_user_with_profile(attrs)

# Orchestration (multi-step operations)
def authenticate_and_create_session(credentials) do
  # 1. Verify credentials
  # 2. Create/find user
  # 3. Create session
  # 4. Send welcome email
end
```

---

## 3. Utility Modules (`lib/easy/*_utils.ex`)

**Location:** `lib/easy/auth_utils.ex`, `lib/easy/string_utils.ex`, etc.

**What belongs here:**
- ✅ Pure, reusable functions
- ✅ Cryptographic operations
- ✅ Format conversions
- ✅ Generic helpers used across contexts
- ❌ NO database access
- ❌ NO business rules
- ❌ NO side effects (ideally)

**Examples:**
```elixir
# Crypto
def generate_token_secret()
def generate_refresh_token()
def hash_password(password)

# Verification
def verify_otp(secret, code)

# JWT
def create_access_token(user, session)

# Time
def token_expires_at(minutes)
```

---

## 4. Controllers (`lib/easy_web/controllers/**/*.ex`)

**Location:** `lib/easy_web/controllers/auth/otp_controller.ex`, etc.

**What belongs here:**
- ✅ Receive HTTP params
- ✅ Basic param validation
- ✅ Call context functions
- ✅ Format JSON responses
- ✅ Handle HTTP errors (status codes)
- ❌ NO business logic
- ❌ NO database queries
- ❌ NO sending emails/SMS
- ❌ NO transactions

**Examples:**
```elixir
def request(conn, %{"email" => email}) do
  case Identity.request_otp(email: email) do
    {:ok, token} ->
      json(conn, %{token_id: token.id, message: "OTP sent"})

    {:error, :rate_limited} ->
      conn
      |> put_status(:too_many_requests)
      |> json(%{error: "Please wait"})
  end
end
```

**Private helpers allowed:**
- Serialization (`serialize_user/1`)
- Error formatting (`format_errors/1`)
- Simple data transformation

---

## Flow Example: OTP Authentication

```
HTTP Request
    ↓
Controller (otp_controller.ex)
  - Extract email from params
  - Call: Identity.request_otp(email: email)
    ↓
Context (identity.ex)
  - Check rate limit (query OneTimeToken)
  - Create token (insert OneTimeToken)
  - Generate OTP code (call AuthUtils)
  - Send email (call Notifications)
    ↓
Schema (one_time_token.ex)
  - Validate changeset
  - Execute query
    ↓
Utils (auth_utils.ex)
  - Generate secret
  - Calculate expiry
    ↓
Notifications (notifications.ex)
  - Send email/SMS
```

---

## Summary

| Type | Database | Business Logic | External Services | HTTP |
|------|----------|----------------|-------------------|------|
| Schema | ✅ Queries only | ❌ | ❌ | ❌ |
| Context | ✅ Via schemas | ✅ | ✅ | ❌ |
| Utils | ❌ | ❌ Limited | ❌ | ❌ |
| Controller | ❌ | ❌ | ❌ | ✅ |

---

## When in doubt:

1. **Is it HTTP-related?** → Controller
2. **Is it orchestrating multiple operations?** → Context
3. **Is it validating/querying one schema?** → Schema file
4. **Is it a generic helper?** → Utils

Follow these rules to keep code maintainable and testable.

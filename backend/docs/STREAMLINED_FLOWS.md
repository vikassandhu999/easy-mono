# Streamlined User Flows

## Overview

This document describes the optimized user journeys for coach registration and client invitation. These flows have been designed to minimize API calls while maintaining clarity and providing all necessary data in each response.

---

## Coach Registration Flow

The coach registration flow requires **exactly 3 API calls** to go from initial signup to having a fully configured business with coach profile.

### Flow Diagram

```
┌─────────────────┐
│  1. Register    │  POST /api/auth/register
│  (email, name)  │  → Returns token_id
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  2. Verify OTP  │  POST /api/auth/verify-otp
│  (token_id,     │  → Returns user + session
│   code)         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  3. Create      │  POST /api/onboarding/business
│  Business       │  → Returns business + coach_profile
│  (name, desc)   │     + subscription
└─────────────────┘
```

### Step 1: Register

Create a new user account and request email verification.

**Request:**

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "coach@example.com",
  "full_name": "John Coach"
}
```

**Response (201 Created):**

```json
{
  "token_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "verification_pending",
  "expires_at": "2024-01-01T12:10:00Z"
}
```

**What Happens:**

- User account is created with unverified email
- OTP code is generated and sent via email
- Token ID is returned for verification step

---

### Step 2: Verify OTP

Verify the email address and create an authenticated session.

**Request:**

```http
POST /api/auth/verify-otp
Content-Type: application/json

{
  "token_id": "550e8400-e29b-41d4-a716-446655440000",
  "code": "123456"
}
```

**Response (200 OK):**

```json
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

**What Happens:**

- OTP code is verified
- Email is marked as verified
- Session is created with access and refresh tokens
- User profile is returned (no roles yet)

---

### Step 3: Create Business

Create a business and automatically create the coach profile.

**Request:**

```http
POST /api/onboarding/business
Authorization: Bearer eyJhbGc...
Content-Type: application/json

{
  "name": "Coaching Pro",
  "description": "Professional coaching services"
}
```

**Response (201 Created):**

```json
{
  "business": {
    "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
    "name": "Coaching Pro",
    "slug": "coaching-pro",
    "description": "Professional coaching services",
    "owner_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "status": "active",
    "created_at": "2024-01-01T12:00:00Z",
    "updated_at": "2024-01-01T12:00:00Z"
  },
  "coach_profile": {
    "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "business_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
    "status": "active",
    "bio": null,
    "specialties": [],
    "credentials": {},
    "created_at": "2024-01-01T12:00:00Z",
    "updated_at": "2024-01-01T12:00:00Z"
  },
  "subscription": {
    "id": "d4e5f6a7-b8c9-0123-def0-123456789012",
    "business_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
    "plan_id": "e5f6a7b8-c9d0-1234-ef01-234567890123",
    "status": "active",
    "current_period_start": "2024-01-01T12:00:00Z",
    "current_period_end": "2024-02-01T12:00:00Z",
    "plan": {
      "id": "e5f6a7b8-c9d0-1234-ef01-234567890123",
      "name": "Free",
      "slug": "free",
      "price_cents": 0,
      "billing_period": "monthly"
    },
    "created_at": "2024-01-01T12:00:00Z",
    "updated_at": "2024-01-01T12:00:00Z"
  }
}
```

**What Happens:**

- Business is created with the user as owner
- Coach profile is automatically created and linked to business
- Free subscription is automatically created
- All related data is returned in a single response

**Idempotency:**

- If the user already owns a business, the existing business is returned with HTTP 200
- No error is thrown for duplicate business creation attempts

---

### Complete Example (JavaScript)

```javascript
async function registerCoach(
  email,
  fullName,
  businessName,
  businessDescription
) {
  // Step 1: Register
  const registerResponse = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, full_name: fullName }),
  });
  const { token_id } = await registerResponse.json();

  // User receives OTP via email
  const otpCode = prompt("Enter OTP code from email:");

  // Step 2: Verify OTP
  const verifyResponse = await fetch("/api/auth/verify-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token_id, code: otpCode }),
  });
  const { user, session } = await verifyResponse.json();

  // Step 3: Create Business
  const businessResponse = await fetch("/api/onboarding/business", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      name: businessName,
      description: businessDescription,
    }),
  });
  const { business, coach_profile, subscription } =
    await businessResponse.json();

  return {
    user,
    session,
    business,
    coach_profile,
    subscription,
  };
}
```

---

## Client Invitation Flow

The client invitation flow requires **exactly 3 API calls** from the client's perspective to go from receiving an invitation to having an active account with coach assignment.

### Flow Diagram

```
┌─────────────────┐
│  1. Invite      │  POST /api/clients/invite (Coach)
│  (email, name,  │  → Returns client + invitation
│   phone, notes) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  2. View        │  GET /api/invitations/:token_id (Client)
│  Invitation     │  → Returns invitation + client + business
│  (token_id)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  3. Accept      │  POST /api/invitations/:token_id/accept (Client)
│  Invitation     │  → Returns user + client_profile + session
│  (code)         │     (with assigned coaches)
└─────────────────┘
```

### Step 1: Coach Invites Client

Coach creates a client invitation.

**Request:**

```http
POST /api/clients/invite
Authorization: Bearer <coach_access_token>
Content-Type: application/json

{
  "email": "client@example.com",
  "full_name": "Jane Client",
  "phone": "+1234567890",
  "notes": "New client from referral"
}
```

**Response (201 Created):**

```json
{
  "client": {
    "id": "f6a7b8c9-d0e1-2345-f012-345678901234",
    "email": "client@example.com",
    "full_name": "Jane Client",
    "phone": "+1234567890",
    "status": "pending",
    "business_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
    "notes": "New client from referral",
    "user_id": null,
    "created_at": "2024-01-01T12:00:00Z",
    "updated_at": "2024-01-01T12:00:00Z"
  },
  "invitation": {
    "token_id": "a7b8c9d0-e1f2-3456-0123-456789012345",
    "invitation_url": "https://app.example.com/invite/a7b8c9d0-e1f2-3456-0123-456789012345",
    "expires_at": "2024-01-08T12:00:00Z"
  }
}
```

**What Happens:**

- Client record is created with "pending" status
- Invitation token is generated with 7-day expiration
- OTP code is generated and sent to client's email
- Invitation URL and token_id are returned
- Coach is automatically set as the inviting coach

**Idempotency:**

- If a pending invitation already exists for this email/business, the existing invitation is returned with HTTP 200
- No duplicate invitations are created

---

### Step 2: Client Views Invitation

Client accesses the invitation link to see details.

**Request:**

```http
GET /api/invitations/a7b8c9d0-e1f2-3456-0123-456789012345
```

**Response (200 OK):**

```json
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
    "name": "Coaching Pro",
    "description": "Professional coaching services"
  },
  "inviting_coach": {
    "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "full_name": "John Coach"
  }
}
```

**What Happens:**

- Invitation token is validated
- Client, business, and coach information is returned
- No authentication required

---

### Step 3: Client Accepts Invitation

Client submits the OTP code to complete registration.

**Request:**

```http
POST /api/invitations/a7b8c9d0-e1f2-3456-0123-456789012345/accept
Content-Type: application/json

{
  "code": "123456"
}
```

**Response (200 OK):**

```json
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
      "phone": "+1234567890",
      "notes": "New client from referral",
      "assigned_coaches": [
        {
          "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
          "user": {
            "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            "full_name": "John Coach",
            "email": "coach@example.com"
          },
          "bio": null,
          "specialties": [],
          "assigned_at": "2024-01-01T12:00:00Z"
        }
      ],
      "created_at": "2024-01-01T12:00:00Z",
      "updated_at": "2024-01-01T12:00:00Z"
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

**What Happens:**

- OTP code is verified
- User account is created with verified email
- User is linked to the existing client record
- Client status is changed from "pending" to "active"
- Client is automatically assigned to the inviting coach
- Session is created with access and refresh tokens
- Complete user profile with client data and assigned coaches is returned

---

### Complete Example (JavaScript)

```javascript
// Coach side: Invite client
async function inviteClient(coachAccessToken, email, fullName, phone, notes) {
  const response = await fetch("/api/clients/invite", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${coachAccessToken}`,
    },
    body: JSON.stringify({ email, full_name: fullName, phone, notes }),
  });
  const { client, invitation } = await response.json();

  // Send invitation.invitation_url to client via email (done automatically)
  return { client, invitation };
}

// Client side: Accept invitation
async function acceptInvitation(tokenId) {
  // Step 1: View invitation details
  const invitationResponse = await fetch(`/api/invitations/${tokenId}`);
  const invitationDetails = await invitationResponse.json();

  // Display invitation details to user
  console.log("Invitation from:", invitationDetails.business.name);
  console.log("Coach:", invitationDetails.inviting_coach.full_name);

  // User receives OTP via email (sent when coach created invitation)
  const otpCode = prompt("Enter OTP code from email:");

  // Step 2: Accept invitation with OTP
  const acceptResponse = await fetch(`/api/invitations/${tokenId}/accept`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: otpCode }),
  });
  const { user, session } = await acceptResponse.json();

  return { user, session };
}
```

---

## Key Design Principles

### 1. Explicit Token References

All authentication flows use explicit `token_id` parameters instead of relying on email/type combinations. This makes the API more explicit and easier to debug.

**Before:**

```json
{
  "email": "user@example.com",
  "type": "login",
  "code": "123456"
}
```

**After:**

```json
{
  "token_id": "550e8400-e29b-41d4-a716-446655440000",
  "code": "123456"
}
```

### 2. Complete Data in Responses

Each response includes all data that the client will need for the next step or to render the UI, eliminating the need for additional API calls.

**Example:** The business creation response includes:

- Business details
- Coach profile
- Subscription information

This allows the frontend to immediately display the complete dashboard without additional requests.

### 3. Idempotent Operations

Critical operations are idempotent to handle network retries gracefully:

- **OTP Generation**: Returns existing token_id if requested within 60 seconds
- **Business Creation**: Returns existing business if user already owns one
- **Client Invitation**: Returns existing invitation if one is pending

### 4. Automatic Relationships

Related entities are created and linked automatically:

- Creating a business automatically creates a coach profile
- Creating a business automatically creates a free subscription
- Accepting an invitation automatically assigns the client to the inviting coach

### 5. Preloaded Associations

Responses include preloaded associations to avoid N+1 queries:

- User responses include coach_profile or client_profile
- Client profile includes assigned_coaches with user details
- Business responses include subscription with plan details

---

## Error Handling

All endpoints use consistent error responses with machine-readable error codes. See [Error Codes](./ERROR_CODES.md) for complete reference.

**Example Error Response:**

```json
{
  "error": {
    "code": "TOKEN_EXPIRED",
    "message": "The OTP token has expired. Please request a new one."
  }
}
```

---

## Related Documentation

- [Authentication API](./AUTHENTICATION_API.md) - Detailed endpoint documentation
- [Error Codes](./ERROR_CODES.md) - Complete error code reference
- [API Structure](./API_STRUCTURE.md) - Overall API architecture

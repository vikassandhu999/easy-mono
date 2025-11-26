# Client Management API Guide

This guide covers the complete client management system for the frontend, including coach-side client management and client self-service features.

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [TypeScript Types](#typescript-types)
4. [Coach Flows](#coach-flows)
   - [List Clients](#list-clients)
   - [Invite Client](#invite-client)
   - [Get Client Details](#get-client-details)
   - [Update Client](#update-client)
   - [Update Client Status](#update-client-status)
   - [Resend Invitation](#resend-invitation)
   - [Archive Client](#archive-client)
5. [Client Invitation Flow](#client-invitation-flow)
   - [View Invitation](#view-invitation)
   - [Client Signup](#client-signup)
6. [Client Self-Service](#client-self-service)
   - [Get My Profile](#get-my-profile)
   - [Update My Profile](#update-my-profile)
7. [Error Handling](#error-handling)

---

## Overview

The client management system supports two types of users:

- **Coaches**: Can invite, manage, and view all clients in their business
- **Clients**: Can view and update their own profile, access assigned resources

### Client Lifecycle

```
1. Coach invites client → Client created with "pending" status + invitation_token
2. Client receives email with invitation link containing the token
3. Client views invitation details (no auth required)
4. Client signs up with any email, passing invitation_token to link account
5. User account created via normal signup flow, client status becomes "active"
6. Coach can update status to "inactive" or "archived"
```

---

## Authentication

### Headers

All authenticated endpoints require:

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

### Token Refresh

When access token expires (check `expires_at`), use the refresh token:

```http
POST /api/auth/token
{
  "refresh_token": "<refresh_token>"
}
```

---

## TypeScript Types

```typescript
// =============================================================================
// Core Types
// =============================================================================

type UUID = string;

type ClientStatus = "pending" | "active" | "inactive" | "archived";

interface Client {
  id: UUID;
  email: string;
  full_name: string;
  phone: string | null;
  notes: string | null;
  status: ClientStatus;
  business_id: UUID;
  user_id: UUID | null;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

interface ClientProfile extends Omit<Client, "notes"> {
  business: Business;
}

interface Business {
  id: UUID;
  name: string;
  handle: string;
}

interface Coach {
  id: UUID;
  user: {
    full_name: string;
  };
}

interface Invitation {
  token: string;
  invitation_url: string;
  expires_at: string; // ISO 8601
}

interface InvitationDetails {
  invitation: {
    token: string;
    status: "valid";
    expires_at: string;
  };
  client: {
    email: string;
    full_name: string;
  };
  business: {
    id: UUID;
    name: string;
  };
  inviting_coach: {
    full_name: string;
  };
}

interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: string; // ISO 8601
  expires_in: number; // seconds
}

interface User {
  id: UUID;
  email: string;
  full_name: string;
  email_verified: boolean;
  roles: ("coach" | "client")[];
  client_profile?: {
    id: UUID;
    business_id: UUID;
    business_name: string;
    status: ClientStatus;
    full_name: string;
    phone: string | null;
    assigned_coaches: Coach[];
  };
}

interface Pagination {
  total: number;
  limit: number;
  offset: number;
}

// =============================================================================
// Request Types
// =============================================================================

interface InviteClientRequest {
  email: string;
  full_name: string;
  phone?: string;
  notes?: string;
}

interface UpdateClientRequest {
  full_name?: string;
  phone?: string;
  notes?: string;
  status?: ClientStatus;
}

interface UpdateClientStatusRequest {
  status: ClientStatus;
}

interface UpdateProfileRequest {
  full_name?: string;
  phone?: string;
}

interface AcceptInvitationRequest {
  token_id: string; // OTP token from email verification
  code: string; // 6-digit OTP code
  invitation_token: string; // Token from invitation URL
}

// =============================================================================
// Response Types
// =============================================================================

interface ListClientsResponse {
  clients: Client[];
  pagination: Pagination;
}

interface ClientResponse {
  client: Client;
}

interface InviteClientResponse {
  client: Client;
  invitation: Invitation;
}

interface InvitationResponse extends InvitationDetails {}

interface AcceptInvitationResponse {
  user: User;
  session: Session;
}

interface ProfileResponse {
  data: ClientProfile;
}

// =============================================================================
// Error Types
// =============================================================================

interface ApiError {
  error_code: string;
  error_message: string;
  error_detail?: Record<string, string[]> | null;
}

type ErrorCode =
  | "not_found"
  | "unauthorized"
  | "invalid_input"
  | "subscription_limit_reached"
  | "invitation_expired"
  | "invitation_used"
  | "invalid_otp"
  | "max_attempts"
  | "internal_error";
```

---

## Coach Flows

### List Clients

Retrieve all clients in the coach's business with optional filtering and pagination.

```http
GET /api/clients
```

#### Query Parameters

| Parameter | Type   | Default | Description                                    |
| --------- | ------ | ------- | ---------------------------------------------- |
| status    | string | -       | Filter by status: pending, active, inactive, archived |
| search    | string | -       | Search by name or email                        |
| limit     | number | 50      | Results per page (max: 100)                    |
| offset    | number | 0       | Pagination offset                              |

#### Example Request

```typescript
const response = await fetch("/api/clients?status=active&limit=20&offset=0", {
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
});

const data: ListClientsResponse = await response.json();
```

#### Example Response (200 OK)

```json
{
  "clients": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "email": "jane.doe@example.com",
      "full_name": "Jane Doe",
      "phone": "+1234567890",
      "notes": "Referred by John",
      "status": "active",
      "business_id": "550e8400-e29b-41d4-a716-446655440000",
      "user_id": "550e8400-e29b-41d4-a716-446655440002",
      "created_at": "2025-11-20T10:30:00Z",
      "updated_at": "2025-11-25T14:00:00Z"
    }
  ],
  "pagination": {
    "total": 45,
    "limit": 20,
    "offset": 0
  }
}
```

---

### Invite Client

Create a new client and send invitation email with OTP code.

```http
POST /api/clients/invite
```

#### Request Body

```json
{
  "email": "new.client@example.com",
  "full_name": "New Client",
  "phone": "+1987654321",
  "notes": "VIP client from referral program"
}
```

#### Example Request

```typescript
const response = await fetch("/api/clients/invite", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    email: "new.client@example.com",
    full_name: "New Client",
    phone: "+1987654321",
    notes: "VIP client",
  }),
});

const data: InviteClientResponse = await response.json();
```

#### Example Response (201 Created)

```json
{
  "client": {
    "id": "550e8400-e29b-41d4-a716-446655440003",
    "email": "new.client@example.com",
    "full_name": "New Client",
    "phone": "+1987654321",
    "notes": "VIP client",
    "status": "pending",
    "business_id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": null,
    "created_at": "2025-11-25T15:00:00Z",
    "updated_at": "2025-11-25T15:00:00Z"
  },
  "invitation": {
    "token": "abc123xyz789...",
    "invitation_url": "https://app.example.com/invite/abc123xyz789...",
    "expires_at": "2025-12-02T15:00:00Z"
  }
}
```

#### Subscription Limit Error (402 Payment Required)

```json
{
  "error_code": "subscription_limit_reached",
  "error_message": "Your subscription plan has reached the maximum number of clients. Please upgrade to invite more clients.",
  "error_detail": {
    "action": "create_client",
    "subscription_status": "trial"
  }
}
```

#### Idempotency

If you invite the same email again before the invitation expires, you'll get the existing client record with the same invitation token.

---

### Get Client Details

Retrieve a specific client's details.

```http
GET /api/clients/:id
```

#### Example Request

```typescript
const clientId = "550e8400-e29b-41d4-a716-446655440001";
const response = await fetch(`/api/clients/${clientId}`, {
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
});

const data: ClientResponse = await response.json();
```

#### Example Response (200 OK)

```json
{
  "client": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "email": "jane.doe@example.com",
    "full_name": "Jane Doe",
    "phone": "+1234567890",
    "notes": "Referred by John. Prefers morning sessions.",
    "status": "active",
    "business_id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "550e8400-e29b-41d4-a716-446655440002",
    "created_at": "2025-11-20T10:30:00Z",
    "updated_at": "2025-11-25T14:00:00Z"
  }
}
```

---

### Update Client

Update a client's information (coach action).

```http
PATCH /api/clients/:id
```

#### Request Body

```json
{
  "full_name": "Jane Smith",
  "phone": "+1555555555",
  "notes": "Updated notes about the client"
}
```

#### Example Request

```typescript
const clientId = "550e8400-e29b-41d4-a716-446655440001";
const response = await fetch(`/api/clients/${clientId}`, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    full_name: "Jane Smith",
    notes: "Prefers evening sessions now",
  }),
});

const data: ClientResponse = await response.json();
```

#### Example Response (200 OK)

```json
{
  "client": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "email": "jane.doe@example.com",
    "full_name": "Jane Smith",
    "phone": "+1234567890",
    "notes": "Prefers evening sessions now",
    "status": "active",
    "business_id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "550e8400-e29b-41d4-a716-446655440002",
    "created_at": "2025-11-20T10:30:00Z",
    "updated_at": "2025-11-25T16:00:00Z"
  }
}
```

---

### Update Client Status

Update only the client's status.

```http
PATCH /api/clients/:id/status
```

#### Request Body

```json
{
  "status": "inactive"
}
```

#### Example Request

```typescript
const clientId = "550e8400-e29b-41d4-a716-446655440001";
const response = await fetch(`/api/clients/${clientId}/status`, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    status: "inactive",
  }),
});

const data: ClientResponse = await response.json();
```

---

### Resend Invitation

Resend the invitation email for a pending client. Generates a new OTP code.

```http
POST /api/clients/:id/resend-invitation
```

#### Example Request

```typescript
const clientId = "550e8400-e29b-41d4-a716-446655440003";
const response = await fetch(`/api/clients/${clientId}/resend-invitation`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
});

const data: ClientResponse = await response.json();
```

#### Example Response (200 OK)

```json
{
  "client": {
    "id": "550e8400-e29b-41d4-a716-446655440003",
    "email": "new.client@example.com",
    "full_name": "New Client",
    "phone": "+1987654321",
    "notes": "VIP client",
    "status": "pending",
    "business_id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": null,
    "created_at": "2025-11-25T15:00:00Z",
    "updated_at": "2025-11-25T16:30:00Z"
  }
}
```

---

### Archive Client

Soft delete a client by setting status to "archived".

```http
DELETE /api/clients/:id
```

#### Example Request

```typescript
const clientId = "550e8400-e29b-41d4-a716-446655440001";
const response = await fetch(`/api/clients/${clientId}`, {
  method: "DELETE",
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
});

const data: ClientResponse = await response.json();
```

#### Example Response (200 OK)

```json
{
  "client": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "email": "jane.doe@example.com",
    "full_name": "Jane Doe",
    "phone": "+1234567890",
    "notes": "Referred by John",
    "status": "archived",
    "business_id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "550e8400-e29b-41d4-a716-446655440002",
    "created_at": "2025-11-20T10:30:00Z",
    "updated_at": "2025-11-25T17:00:00Z"
  }
}
```

---

## Client Invitation Flow

These endpoints are used by clients to view invitations and complete signup.

### Complete Flow (4 API Calls)

```
1. POST /api/clients/invite              → Coach creates invitation (returns invitation_token)
2. GET /api/invitations/:token           → Client views invitation details (public)
3. POST /api/auth/register               → Client registers with any email (returns OTP token_id)
4. POST /api/auth/client-signup          → Client verifies OTP + links to invitation
```

### View Invitation

View invitation details. Used when client clicks the invitation link. **No authentication required.**

```http
GET /api/invitations/:token
```

#### Example Request

```typescript
const token = "abc123xyz789...";
const response = await fetch(`/api/invitations/${token}`);
const data: InvitationResponse = await response.json();
```

#### Example Response (200 OK)

```json
{
  "invitation": {
    "token": "abc123xyz789...",
    "status": "valid",
    "expires_at": "2025-12-02T15:00:00Z"
  },
  "client": {
    "email": "new.client@example.com",
    "full_name": "New Client"
  },
  "business": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Fitness Pro Coaching"
  },
  "inviting_coach": {
    "full_name": "Coach Smith"
  }
}
```

#### Error Responses

**404 Not Found** - Invalid token:
```json
{
  "error_code": "not_found",
  "error_message": "Invitation not found or invalid"
}
```

**410 Gone** - Expired invitation:
```json
{
  "error_code": "invitation_expired",
  "error_message": "This invitation has expired"
}
```

---

### Client Signup

Complete the client signup by verifying email OTP and linking to the invitation. The client first registers using the normal registration flow (`POST /api/auth/register`), then completes signup with the OTP code and invitation token.

```http
POST /api/auth/client-signup
```

#### Request Body

```json
{
  "token_id": "550e8400-e29b-41d4-a716-446655440010",
  "code": "123456",
  "invitation_token": "abc123xyz789..."
}
```

- `token_id`: The OTP token ID returned from `/api/auth/register`
- `code`: The 6-digit OTP code sent to the client's email
- `invitation_token`: The invitation token from the invitation URL

#### Example Request

```typescript
// Step 1: Register with any email
const registerResponse = await fetch("/api/auth/register", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "client@example.com",
    first_name: "John",
    last_name: "Doe",
    business_name: null // Not creating a business
  }),
});
const registerData = await registerResponse.json();
const tokenId = registerData.token.token_id;

// Step 2: Client receives OTP via email, then completes signup
const signupResponse = await fetch("/api/auth/client-signup", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    token_id: tokenId,
    code: "123456", // From email
    invitation_token: invitationToken, // From invitation URL
  }),
});

const data: AcceptInvitationResponse = await signupResponse.json();

// Store tokens for authenticated requests
localStorage.setItem("access_token", data.session.access_token);
localStorage.setItem("refresh_token", data.session.refresh_token);
```

#### Example Response (200 OK)

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440005",
    "email": "client@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "email_verified": true,
    "roles": ["client"],
    "client_profile": {
      "id": "550e8400-e29b-41d4-a716-446655440003",
      "business_id": "550e8400-e29b-41d4-a716-446655440000",
      "business_name": "Fitness Pro Coaching",
      "status": "active",
      "full_name": "New Client",
      "phone": "+1987654321",
      "assigned_coaches": [
        {
          "id": "550e8400-e29b-41d4-a716-446655440006",
          "user": {
            "full_name": "Coach Smith"
          }
        }
      ]
    }
  },
  "session": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4..."
  }
}
```

#### Error Responses

**400 Bad Request** - Invalid OTP:
```json
{
  "error_code": "invalid_otp",
  "error_message": "Invalid OTP code"
}
```

**404 Not Found** - Invalid invitation token:
```json
{
  "error_code": "not_found",
  "error_message": "Invitation not found or invalid"
}
```

**410 Gone** - Expired invitation:
```json
{
  "error_code": "invitation_expired",
  "error_message": "This invitation has expired"
}
```

**429 Too Many Requests** - Max attempts:
```json
{
  "error_code": "max_attempts",
  "error_message": "Maximum verification attempts exceeded"
}
```

---

## Client Self-Service

These endpoints allow authenticated clients to manage their own profile.

### Get My Profile

Retrieve the authenticated client's profile with business info.

```http
GET /api/me/profile
```

#### Example Request

```typescript
const response = await fetch("/api/me/profile", {
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
});

const data: ProfileResponse = await response.json();
```

#### Example Response (200 OK)

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440003",
    "email": "new.client@example.com",
    "full_name": "New Client",
    "phone": "+1987654321",
    "status": "active",
    "business": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Fitness Pro Coaching",
      "handle": "fitness-pro"
    },
    "created_at": "2025-11-25T15:00:00Z",
    "updated_at": "2025-11-25T18:00:00Z"
  }
}
```

---

### Update My Profile

Update the authenticated client's own profile. Clients can only update `full_name` and `phone`.

```http
PATCH /api/me/profile
```

#### Request Body

```json
{
  "full_name": "Updated Name",
  "phone": "+1999999999"
}
```

#### Example Request

```typescript
const response = await fetch("/api/me/profile", {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    full_name: "Updated Name",
    phone: "+1999999999",
  }),
});

const data: ProfileResponse = await response.json();
```

#### Example Response (200 OK)

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440003",
    "email": "new.client@example.com",
    "full_name": "Updated Name",
    "phone": "+1999999999",
    "status": "active",
    "business": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Fitness Pro Coaching",
      "handle": "fitness-pro"
    },
    "created_at": "2025-11-25T15:00:00Z",
    "updated_at": "2025-11-25T19:00:00Z"
  }
}
```

---

## Error Handling

### Standard Error Format

All errors follow this format:

```json
{
  "error_code": "error_code_here",
  "error_message": "Human-readable error message",
  "error_detail": {
    "field_name": ["Error message 1", "Error message 2"]
  }
}
```

### HTTP Status Codes

| Status | Meaning               | Common Causes                          |
| ------ | --------------------- | -------------------------------------- |
| 400    | Bad Request           | Invalid OTP, malformed request         |
| 401    | Unauthorized          | Missing/invalid token                  |
| 402    | Payment Required      | Subscription limit reached             |
| 403    | Forbidden             | Insufficient permissions               |
| 404    | Not Found             | Resource doesn't exist                 |
| 410    | Gone                  | Invitation expired/used                |
| 422    | Unprocessable Entity  | Validation errors                      |
| 429    | Too Many Requests     | Rate limited / max attempts exceeded   |
| 500    | Internal Server Error | Server-side error                      |

### Error Handling Example

```typescript
async function apiRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    const error = data as ApiError;
    
    switch (response.status) {
      case 401:
        // Redirect to login or refresh token
        await refreshTokenAndRetry();
        break;
      case 402:
        // Show upgrade modal
        showUpgradeModal(error.error_message);
        break;
      case 410:
        // Handle expired/used invitation
        showExpiredInvitationUI();
        break;
      case 422:
        // Show validation errors
        showFieldErrors(error.error_detail);
        break;
      default:
        showToast(error.error_message);
    }
    
    throw new ApiException(error);
  }

  return data as T;
}
```

---

## React Hooks Example

```typescript
// useClients.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useClients(params?: { status?: ClientStatus; search?: string }) {
  return useQuery({
    queryKey: ["clients", params],
    queryFn: () => apiRequest<ListClientsResponse>(`/api/clients?${new URLSearchParams(params)}`),
  });
}

export function useInviteClient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: InviteClientRequest) =>
      apiRequest<InviteClientResponse>("/api/clients/invite", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

export function useAcceptInvitation(invitationToken: string) {
  return useMutation({
    mutationFn: ({ tokenId, code }: { tokenId: string; code: string }) =>
      apiRequest<AcceptInvitationResponse>("/api/auth/client-signup", {
        method: "POST",
        body: JSON.stringify({ 
          token_id: tokenId, 
          code,
          invitation_token: invitationToken 
        }),
      }),
    onSuccess: (data) => {
      // Store tokens
      localStorage.setItem("access_token", data.session.access_token);
      localStorage.setItem("refresh_token", data.session.refresh_token);
      // Redirect to dashboard
      window.location.href = "/dashboard";
    },
  });
}

export function useClientProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: () => apiRequest<ProfileResponse>("/api/me/profile"),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: UpdateProfileRequest) =>
      apiRequest<ProfileResponse>("/api/me/profile", {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}
```

---

## Invitation Page Example

```tsx
// pages/invite/[token].tsx
import { useRouter } from "next/router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";

export default function InvitationPage() {
  const router = useRouter();
  const { token: invitationToken } = router.query as { token: string };
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [code, setCode] = useState("");
  const [tokenId, setTokenId] = useState<string | null>(null);

  // Fetch invitation details
  const { data, isLoading, error } = useQuery({
    queryKey: ["invitation", invitationToken],
    queryFn: () => fetch(`/api/invitations/${invitationToken}`).then(r => r.json()),
    enabled: !!invitationToken,
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: (userData: { email: string; first_name: string; last_name: string }) =>
      fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      }).then(r => r.json()),
    onSuccess: (data) => {
      setTokenId(data.token.token_id);
    },
  });

  // Complete signup mutation
  const signupMutation = useMutation({
    mutationFn: ({ tokenId, code }: { tokenId: string; code: string }) =>
      fetch("/api/auth/client-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          token_id: tokenId, 
          code, 
          invitation_token: invitationToken 
        }),
      }).then(r => r.json()),
    onSuccess: (data) => {
      localStorage.setItem("access_token", data.session.access_token);
      localStorage.setItem("refresh_token", data.session.refresh_token);
      router.push("/dashboard");
    },
  });

  if (isLoading) return <LoadingSpinner />;
  
  if (error?.error_code === "invitation_expired") {
    return <ExpiredInvitationMessage />;
  }

  return (
    <div className="invitation-page">
      <h1>You're invited to {data.business.name}</h1>
      <p>Coach {data.inviting_coach.full_name} has invited you to join as a client.</p>
      
      <div className="client-info">
        <p>Invited as: {data.client.full_name}</p>
        <p>Original email: {data.client.email}</p>
      </div>

      {!tokenId ? (
        // Step 1: Registration form
        <form onSubmit={(e) => {
          e.preventDefault();
          registerMutation.mutate({ 
            email, 
            first_name: firstName, 
            last_name: lastName 
          });
        }}>
          <h2>Create your account</h2>
          <p>You can sign up with any email address.</p>
          
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
          />
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="First Name"
            required
          />
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Last Name"
            required
          />
          <button type="submit" disabled={registerMutation.isPending}>
            {registerMutation.isPending ? "Sending code..." : "Continue"}
          </button>
        </form>
      ) : (
        // Step 2: OTP verification
        <form onSubmit={(e) => {
          e.preventDefault();
          signupMutation.mutate({ tokenId, code });
        }}>
          <h2>Verify your email</h2>
          <p>Enter the 6-digit code sent to {email}</p>
          
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={6}
            pattern="\d{6}"
            placeholder="000000"
          />
          <button type="submit" disabled={signupMutation.isPending}>
            {signupMutation.isPending ? "Verifying..." : "Complete Signup"}
          </button>
        </form>
      )}

      {(registerMutation.error || signupMutation.error) && (
        <div className="error">
          {registerMutation.error?.error_message || signupMutation.error?.error_message}
        </div>
      )}
    </div>
  );
}
```

---

## Summary

| Endpoint                              | Method | Auth Required | Description                    |
| ------------------------------------- | ------ | ------------- | ------------------------------ |
| `/api/clients`                        | GET    | Coach         | List clients                   |
| `/api/clients/invite`                 | POST   | Coach         | Invite new client              |
| `/api/clients/:id`                    | GET    | Coach         | Get client details             |
| `/api/clients/:id`                    | PATCH  | Coach         | Update client                  |
| `/api/clients/:id/status`             | PATCH  | Coach         | Update client status           |
| `/api/clients/:id/resend-invitation`  | POST   | Coach         | Resend invitation email        |
| `/api/clients/:id`                    | DELETE | Coach         | Archive client                 |
| `/api/invitations/:token`             | GET    | None          | View invitation details        |
| `/api/auth/register`                  | POST   | None          | Register new user (get OTP)    |
| `/api/auth/client-signup`             | POST   | None          | Verify OTP + link invitation   |
| `/api/me/profile`                     | GET    | Client        | Get own profile                |
| `/api/me/profile`                     | PATCH  | Client        | Update own profile             |

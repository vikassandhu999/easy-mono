# Easy Backend API Structure

## Overview

This document describes the unified REST API structure for the Easy coaching platform. The API serves both coach and client applications through role-based endpoints.

---

## Architecture

### Single Endpoint Design

```
EasyWeb.Endpoint (Port 4000)
├── /api/v1/auth/*           → Public authentication routes
├── /api/v1/invitations/*    → Public invitation routes
├── /api/v1/onboarding/*     → Authenticated user onboarding
├── /api/v1/coach/*          → Coach-specific routes (requires coach role)
└── /api/v1/client/*         → Client-specific routes (requires client role)
```

**Benefits:**
- ✅ Single port (4000) for all API traffic
- ✅ Unified authentication and session management
- ✅ Clear role-based access control via middleware
- ✅ Easier to deploy and monitor
- ✅ Simplified CORS configuration

---

## File Structure

```
lib/
├── easy/                              # Business logic layer
│   ├── identity/                      # Authentication & user management
│   │   ├── user.ex
│   │   ├── one_time_token.ex
│   │   └── user_session.ex
│   │
│   ├── tenant/                        # Multi-tenant domain models
│   │   ├── business.ex
│   │   ├── coach.ex
│   │   ├── client.ex
│   │   └── client_subscription.ex
│   │
│   ├── identity.ex                    # Identity context (public API)
│   ├── tenant.ex                      # Tenant context (public API)
│   ├── application.ex                 # Application supervisor
│   └── repo.ex                        # Database repository
│
└── easy_web/                          # Web/HTTP layer
    ├── controllers/                   # REST controllers (to be created)
    │   ├── auth/
    │   │   ├── otp_controller.ex
    │   │   └── session_controller.ex
    │   │
    │   ├── invitations/
    │   │   └── invitation_controller.ex
    │   │
    │   ├── onboarding/
    │   │   └── onboarding_controller.ex
    │   │
    │   ├── coach/
    │   │   ├── dashboard_controller.ex
    │   │   ├── profile_controller.ex
    │   │   ├── business_controller.ex
    │   │   ├── client_controller.ex
    │   │   └── client_subscription_controller.ex
    │   │
    │   ├── client/
    │   │   ├── dashboard_controller.ex
    │   │   ├── profile_controller.ex
    │   │   ├── coach_controller.ex
    │   │   └── subscription_controller.ex
    │   │
    │   └── health_controller.ex       # ✅ Created
    │
    ├── plugs/                         # Custom middleware (to be created)
    │   ├── authenticate.ex
    │   ├── require_coach.ex
    │   └── require_client.ex
    │
    ├── endpoint.ex                    # ✅ Phoenix endpoint
    ├── router.ex                      # ✅ Route definitions
    └── telemetry.ex                   # Metrics & monitoring
```

---

## Request Flow

### 1. Public Request (No Auth)
```
HTTP Request
    ↓
EasyWeb.Endpoint
    ↓
:api pipeline (JSON)
    ↓
Controller (Auth/Invitation)
    ↓
Context (Identity/Tenant)
    ↓
Database (Repo)
    ↓
JSON Response
```

### 2. Authenticated Request
```
HTTP Request + Bearer Token
    ↓
EasyWeb.Endpoint
    ↓
:api pipeline
    ↓
:authenticate pipeline (verify JWT)
    ↓
Controller
    ↓
Context
    ↓
Database
    ↓
JSON Response
```

### 3. Role-Based Request (Coach/Client)
```
HTTP Request + Bearer Token
    ↓
EasyWeb.Endpoint
    ↓
:api pipeline
    ↓
:authenticate pipeline (verify JWT, load user)
    ↓
:require_coach OR :require_client (verify role, load coach/client)
    ↓
Controller (has access to current_user, current_coach/current_client)
    ↓
Context
    ↓
Database
    ↓
JSON Response
```

---

## API Endpoints

### Public Routes (No Authentication)

#### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/request-otp` | Request OTP code |
| POST | `/api/v1/auth/verify-otp` | Verify OTP and login |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| POST | `/api/v1/auth/logout` | Logout and revoke session |

#### Invitations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/invitations/:token` | Verify invitation token |
| POST | `/api/v1/invitations/:token/accept` | Accept invitation |

#### Health Check
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | System health check |

---

### Authenticated Routes (User)

#### Onboarding
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/onboarding/status` | Check onboarding status |
| POST | `/api/v1/onboarding/business` | Create business & coach profile |
| POST | `/api/v1/onboarding/complete` | Mark onboarding complete |

---

### Coach Routes (Requires Coach Role)

#### Dashboard & Profile
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/coach/dashboard` | Coach dashboard stats |
| GET | `/api/v1/coach/profile` | Get coach profile |
| PUT/PATCH | `/api/v1/coach/profile` | Update coach profile |

#### Business Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/coach/business` | Get business details |
| PUT/PATCH | `/api/v1/coach/business` | Update business |

#### Client Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/coach/clients` | List all clients |
| POST | `/api/v1/coach/clients` | Create new client |
| GET | `/api/v1/coach/clients/:id` | Get client details |
| PUT/PATCH | `/api/v1/coach/clients/:id` | Update client |
| DELETE | `/api/v1/coach/clients/:id` | Delete client |
| POST | `/api/v1/coach/clients/invite` | Invite new client |
| POST | `/api/v1/coach/clients/:id/resend-invitation` | Resend invitation |

#### Subscription Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/coach/clients/:client_id/subscriptions` | List client's subscriptions |
| POST | `/api/v1/coach/clients/:client_id/subscriptions` | Create subscription for client |
| GET | `/api/v1/coach/subscriptions` | List all subscriptions |
| GET | `/api/v1/coach/subscriptions/:id` | Get subscription details |
| PUT/PATCH | `/api/v1/coach/subscriptions/:id` | Update subscription |
| DELETE | `/api/v1/coach/subscriptions/:id` | Delete subscription |
| POST | `/api/v1/coach/subscriptions/:id/record-payment` | Record payment received |
| POST | `/api/v1/coach/subscriptions/:id/cancel` | Cancel subscription |

---

### Client Routes (Requires Client Role)

#### Dashboard & Profile
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/client/dashboard` | Client dashboard |
| GET | `/api/v1/client/profile` | Get client profile |
| PUT/PATCH | `/api/v1/client/profile` | Update client profile |

#### Coach & Subscriptions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/client/coach` | Get assigned coach info |
| GET | `/api/v1/client/subscriptions` | List my subscriptions |
| GET | `/api/v1/client/subscriptions/:id` | Get subscription details |

---

## Authentication & Authorization

### JWT Token Structure
```json
{
  "sub": "user_uuid",
  "role": "coach",
  "business_id": "business_uuid",
  "coach_id": "coach_uuid",
  "iat": 1699564800,
  "exp": 1699651200
}
```

### Authentication Methods

The API supports two authentication methods:

**1. Cookie-Based (Recommended)**
```javascript
// Tokens stored in HTTP-only cookies
fetch('/api/businesses/123', {
  credentials: 'include' // Automatically sends cookies
})
```

**2. Token-Based (Legacy)**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
Accept: application/json
```

**Note**: Cookie-based authentication is more secure (protected from XSS attacks) and requires less client-side code. See [Cookie Authentication](./COOKIE_AUTH.md) for details.

### Response Formats

#### Success Response
```json
{
  "data": {
    "id": "uuid",
    "name": "John Doe",
    ...
  }
}
```

#### Error Response
```json
{
  "error": {
    "code": "validation_error",
    "message": "Validation failed",
    "details": {
      "email": ["can't be blank"]
    }
  }
}
```

### HTTP Status Codes
- `200 OK` - Success (GET, PUT, PATCH)
- `201 Created` - Resource created (POST)
- `204 No Content` - Success with no body (DELETE)
- `400 Bad Request` - Invalid request
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Not authorized (wrong role)
- `404 Not Found` - Resource doesn't exist
- `422 Unprocessable Entity` - Validation error
- `500 Internal Server Error` - Server error

---

## Multi-Tenant Isolation

All operations are scoped by `business_id`:

```elixir
# Example: Coach can only see clients from their business
def list_clients(conn, _params) do
  coach = conn.assigns.current_coach
  clients = Tenant.list_clients(coach.business_id)  # ← Filtered by business
  json(conn, %{data: clients})
end
```

**Security Rules:**
- ✅ Every request verifies business_id from JWT
- ✅ All database queries filter by business_id
- ✅ Cross-tenant access is impossible
- ✅ Each business's data is completely isolated

---

## Testing the API

### Test Health Endpoint
```bash
curl http://localhost:4000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "easy-backend",
  "timestamp": "2025-11-05T13:30:00Z",
  "version": "1.0.0"
}
```

### Start the Server
```bash
cd easy-backend
mix phx.server
```

Server will start on: `http://localhost:4000`

---

## Next Steps

### Phase 1: Authentication & Onboarding
- [ ] Create authentication plugs
- [ ] Implement OTP controller
- [ ] Implement session controller
- [ ] Implement onboarding controller

### Phase 2: Coach Features
- [ ] Create coach controllers
- [ ] Implement client management
- [ ] Implement subscription management

### Phase 3: Client Features
- [ ] Create client controllers
- [ ] Implement dashboard
- [ ] Implement profile management

### Phase 4: Content & Programs (Future)
- [ ] Exercise management
- [ ] Workout templates
- [ ] Meal plans
- [ ] Coaching programs

---

## Migration Status

✅ **Completed:**
- Removed separate CoachApp and ClientApp endpoints
- Created unified EasyWeb.Endpoint on port 4000
- Updated application.ex to use single endpoint
- Created complete router with all routes defined
- Cleaned up config files
- Created health check endpoint

📋 **To Do:**
- Create authentication plugs (Authenticate, RequireCoach, RequireClient)
- Create all controllers (auth, onboarding, coach, client)
- Implement JWT token generation and verification
- Implement OTP generation and verification
- Add tests for all endpoints

---

## Configuration

### Development
- **Port:** 4000
- **Host:** localhost
- **Database:** PostgreSQL (easy-db)
- **CORS:** Enabled for localhost:3000, 3001, 5173

### Production
- Configure in `config/runtime.exs`
- Set proper CORS origins
- Use secure JWT secrets
- Enable SSL/TLS

---

## Questions?

See the main README.md or contact the development team.
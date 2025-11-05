# OTP Token Types Reference

This document describes all OTP token types supported by the Easy platform, their purposes, flows, and implementation details.

---

## 📋 **Token Types Overview**

The platform supports 11 token types, categorized by functionality:

```elixir
field :token_type, Ecto.Enum,
  values: [
    # Core Authentication (Phase 1 - MVP)
    :authentication,           # ✅ Active - Login (signup/signin)
    :invitation_acceptance,    # ✅ Active - Client accepting invitation
    
    # Account Management (Phase 2)
    :phone_verification,       # 🟡 Future - Add/change phone
    :email_verification,       # 🟡 Future - Add/change email
    
    # Coach Management (Phase 2)
    :coach_invitation,         # 🟡 Future - Invite another coach
    
    # Security & Sensitive Actions (Phase 3)
    :account_deletion,         # 🟢 Future - Delete account confirmation
    :business_transfer,        # 🟢 Future - Transfer business ownership
    :payment_confirmation,     # 🟢 Future - Confirm large payment
    :session_verification,     # 🟢 Future - Verify sensitive action
    
    # Multi-Factor Authentication (Phase 3)
    :mfa_setup,               # 🟢 Future - Enable 2FA
    :mfa_login                # 🟢 Future - 2FA login step
  ]
```

---

## 🎯 **Phase 1: Core Authentication (MVP - Active)**

### **1. `:authentication`**

**Purpose:** Unified login flow that handles both signup and signin

**User Journey:**
```
User opens app → Enters email/phone → Receives OTP → Enters OTP → Logged in
```

**Flow:**
```
POST /api/v1/auth/request-otp
{
  "email": "user@example.com"
  // OR
  "phone": "+919876543210"
}

Response:
{
  "data": {
    "token_id": "uuid",
    "expires_at": "2025-11-05T14:00:00Z",
    "message": "OTP sent"
  }
}

→ User receives OTP: "123456"

POST /api/v1/auth/verify-otp
{
  "token_id": "uuid",
  "otp": "123456"
}

Response:
{
  "data": {
    "access_token": "jwt_token",
    "refresh_token": "uuid",
    "next_step": "onboarding|coach_dashboard|client_dashboard",
    "user": {...}
  }
}
```

**Database Record:**
```elixir
%OneTimeToken{
  token_type: :authentication,
  relates_to_email: "user@example.com",
  secret: "totp_secret",
  expires_at: ~U[2025-11-05 14:00:00Z],
  used: false,
  metadata: %{}
}
```

**Backend Behavior:**
- If user exists → Sign in → Return appropriate dashboard
- If user doesn't exist → Create user → Return "onboarding"
- No distinction between signup/signin on frontend

**Use Cases:**
- New user signing up
- Existing coach logging in
- Existing client logging in

---

### **2. `:invitation_acceptance`**

**Purpose:** Client accepting coach's invitation to join the platform

**User Journey:**
```
Coach invites client → Client receives SMS/Email → Clicks link → Enters phone → 
Receives OTP → Enters OTP → Account created and linked to coach
```

**Flow:**
```
# Step 1: Coach creates invitation
POST /api/v1/coach/clients/invite
{
  "name": "Sarah Johnson",
  "email": "sarah@example.com",
  "phone": "+919876543210"
}

Response:
{
  "data": {
    "client": {...},
    "invitation_token": "abc123",
    "invitation_link": "https://app.com/invite/abc123"
  }
}

# Step 2: Client clicks link and verifies invitation
GET /api/v1/invitations/abc123

Response:
{
  "data": {
    "valid": true,
    "client_name": "Sarah Johnson",
    "coach_name": "John Doe",
    "business_name": "Fit Gym"
  }
}

# Step 3: Client enters their phone
POST /api/v1/invitations/abc123/accept
{
  "phone": "+919876543210"
}

Response:
{
  "data": {
    "token_id": "uuid",
    "expires_at": "2025-11-05T14:00:00Z",
    "message": "OTP sent to your phone"
  }
}

# Step 4: Client verifies OTP
POST /api/v1/auth/verify-otp
{
  "token_id": "uuid",
  "otp": "123456"
}

Response:
{
  "data": {
    "access_token": "jwt_with_client_role",
    "refresh_token": "uuid",
    "next_step": "client_dashboard",
    "user": {...},
    "client": {...},
    "coach": {...},
    "business": {...}
  }
}
```

**Database Record:**
```elixir
%OneTimeToken{
  token_type: :invitation_acceptance,
  relates_to_phone: "+919876543210",
  secret: "totp_secret",
  expires_at: ~U[2025-11-05 14:00:00Z],
  used: false,
  metadata: %{
    "invitation_token" => "abc123",
    "client_id" => "client_uuid"
  }
}
```

**Backend Behavior:**
- Creates new user account with provided phone/email
- Links user to existing client record (via `client_id` in metadata)
- Clears `invitation_token` from client record
- Sets `user_id` on client record
- Creates session and returns JWT with client role

**Use Cases:**
- Client accepting invitation from coach
- Client creating account for first time via invitation

---

## 🟡 **Phase 2: Account & Coach Management (Future)**

### **3. `:phone_verification`**

**Purpose:** Verify phone ownership when adding or changing phone number

**User Journey:**
```
User logged in → Goes to settings → Wants to add/change phone → 
Enters new phone → Receives OTP → Enters OTP → Phone updated
```

**Flow:**
```
# User already authenticated
POST /api/v1/profile/verify-phone
Authorization: Bearer <jwt>
{
  "phone": "+919876543210"
}

Response:
{
  "data": {
    "token_id": "uuid",
    "expires_at": "2025-11-05T14:00:00Z",
    "message": "OTP sent to new phone number"
  }
}

POST /api/v1/auth/verify-otp
{
  "token_id": "uuid",
  "otp": "123456"
}

Response:
{
  "data": {
    "message": "Phone number updated successfully",
    "user": {
      "phone": "+919876543210",
      "phone_confirmed_at": "2025-11-05T13:30:00Z"
    }
  }
}
```

**Database Record:**
```elixir
%OneTimeToken{
  token_type: :phone_verification,
  relates_to_phone: "+919876543210",
  user_id: current_user.id,
  secret: "totp_secret",
  expires_at: ~U[2025-11-05 14:00:00Z],
  metadata: %{
    "action" => "add_phone"  # or "change_phone"
  }
}
```

**Backend Behavior:**
- Verify user is authenticated
- Check new phone not already in use
- Send OTP to new phone number
- After verification, update user's phone and set `phone_confirmed_at`

---

### **4. `:email_verification`**

**Purpose:** Verify email ownership when adding or changing email address

**User Journey:**
```
User logged in → Goes to settings → Wants to add/change email → 
Enters new email → Receives OTP → Enters OTP → Email updated
```

**Flow:** Similar to `:phone_verification` but for email

**Database Record:**
```elixir
%OneTimeToken{
  token_type: :email_verification,
  relates_to_email: "newemail@example.com",
  user_id: current_user.id,
  secret: "totp_secret",
  expires_at: ~U[2025-11-05 14:00:00Z],
  metadata: %{
    "action" => "add_email"  # or "change_email"
  }
}
```

---

### **5. `:coach_invitation`**

**Purpose:** Business owner inviting another coach to join the business

**User Journey:**
```
Business owner → Invites coach → Coach receives email → Clicks link → 
Verifies OTP → Coach account created and linked to business
```

**Flow:** Similar to `:invitation_acceptance` but creates coach instead of client

**Database Record:**
```elixir
%OneTimeToken{
  token_type: :coach_invitation,
  relates_to_email: "newcoach@example.com",
  secret: "totp_secret",
  expires_at: ~U[2025-11-05 14:00:00Z],
  metadata: %{
    "business_id" => "business_uuid",
    "invited_by" => "owner_user_id",
    "role" => "coach"  # or "assistant_coach"
  }
}
```

**Backend Behavior:**
- Creates user if doesn't exist
- Creates coach record linked to business
- Grants appropriate permissions

---

## 🟢 **Phase 3: Security & MFA (Future)**

### **6. `:account_deletion`**

**Purpose:** Extra confirmation before permanently deleting account

**User Journey:**
```
User → Requests account deletion → Receives OTP → Enters OTP → Account deleted
```

**Database Record:**
```elixir
%OneTimeToken{
  token_type: :account_deletion,
  relates_to_email: user.email,
  user_id: current_user.id,
  secret: "totp_secret",
  expires_at: ~U[2025-11-05 14:00:00Z],
  metadata: %{
    "deletion_reason" => "switching_platform",
    "requested_at" => "2025-11-05T13:00:00Z"
  }
}
```

**Backend Behavior:**
- Soft delete user account
- Anonymize personal data
- Cancel active subscriptions
- Notify relevant parties

---

### **7. `:business_transfer`**

**Purpose:** Transfer business ownership to another user

**Database Record:**
```elixir
%OneTimeToken{
  token_type: :business_transfer,
  relates_to_email: "newowner@example.com",
  secret: "totp_secret",
  expires_at: ~U[2025-11-05 14:00:00Z],
  metadata: %{
    "business_id" => "business_uuid",
    "current_owner_id" => "current_owner_uuid",
    "transfer_type" => "ownership"
  }
}
```

**Backend Behavior:**
- Verify new owner's identity
- Transfer business ownership
- Update permissions
- Notify both parties

---

### **8. `:payment_confirmation`**

**Purpose:** Two-factor confirmation for large payment transactions

**Database Record:**
```elixir
%OneTimeToken{
  token_type: :payment_confirmation,
  relates_to_phone: user.phone,
  user_id: current_user.id,
  secret: "totp_secret",
  expires_at: ~U[2025-11-05 14:00:00Z],
  metadata: %{
    "payment_id" => "payment_uuid",
    "amount" => 50000,
    "currency" => "INR"
  }
}
```

---

### **9. `:session_verification`**

**Purpose:** Verify sensitive actions from new/untrusted devices

**Database Record:**
```elixir
%OneTimeToken{
  token_type: :session_verification,
  relates_to_phone: user.phone,
  user_id: current_user.id,
  secret: "totp_secret",
  expires_at: ~U[2025-11-05 14:00:00Z],
  metadata: %{
    "action" => "delete_client",
    "resource_id" => "client_uuid",
    "device_info" => "New device detected"
  }
}
```

---

### **10. `:mfa_setup`**

**Purpose:** Enable two-factor authentication on account

**Database Record:**
```elixir
%OneTimeToken{
  token_type: :mfa_setup,
  relates_to_phone: user.phone,
  user_id: current_user.id,
  secret: "totp_secret",
  expires_at: ~U[2025-11-05 14:00:00Z],
  metadata: %{
    "mfa_method" => "totp",
    "backup_codes_generated" => true
  }
}
```

---

### **11. `:mfa_login`**

**Purpose:** Second factor verification during login (when MFA is enabled)

**Database Record:**
```elixir
%OneTimeToken{
  token_type: :mfa_login,
  relates_to_phone: user.phone,
  user_id: partially_authenticated_user.id,
  secret: "totp_secret",
  expires_at: ~U[2025-11-05 14:00:00Z],
  metadata: %{
    "partial_session_id" => "session_uuid"
  }
}
```

---

## 🗄️ **Database Schema**

```elixir
schema "one_time_tokens" do
  # Token type (enum with all 11 values)
  field :token_type, Ecto.Enum

  # TOTP secret for OTP generation/verification
  field :secret, :string

  # Expiration (typically 15 minutes)
  field :expires_at, :utc_datetime

  # Usage tracking
  field :used, :boolean, default: false
  field :used_at, :utc_datetime

  # Contact information (at least one required)
  field :relates_to_email, :string
  field :relates_to_phone, :string

  # Rate limiting
  field :attempt_count, :integer, default: 0
  field :last_attempt_at, :utc_datetime

  # Flexible context data (JSON)
  field :metadata, :map, default: %{}

  # Optional link to user
  belongs_to :user, User

  timestamps(type: :utc_datetime)
end
```

---

## 🔒 **Security Considerations**

### **General Rules:**

1. **Expiration:** All tokens expire after 15 minutes (configurable)
2. **Single-use:** Once verified, token is marked `used: true`
3. **Rate limiting:** Max 5 OTP requests per contact method per hour
4. **Attempt tracking:** Max 5 verification attempts per token
5. **No API exposure:** OTP code never returned in API response
6. **Secure channels:** OTP sent only via SMS/Email
7. **Cleanup:** Expired/used tokens cleaned up after 7 days

### **Per Token Type:**

| Token Type | User Required | Expiry | Max Attempts |
|-----------|---------------|--------|--------------|
| `:authentication` | No | 15 min | 5 |
| `:invitation_acceptance` | No | 24 hours | 5 |
| `:phone_verification` | Yes | 15 min | 5 |
| `:email_verification` | Yes | 15 min | 5 |
| `:coach_invitation` | No | 7 days | 5 |
| `:account_deletion` | Yes | 5 min | 3 |
| `:business_transfer` | No | 24 hours | 5 |
| `:payment_confirmation` | Yes | 5 min | 3 |
| `:session_verification` | Yes | 5 min | 3 |
| `:mfa_setup` | Yes | 10 min | 5 |
| `:mfa_login` | Yes | 5 min | 5 |

---

## 📊 **Implementation Checklist**

### **Phase 1 (MVP - Now):**
- [x] `:authentication` - Implemented
- [x] `:invitation_acceptance` - Implemented
- [x] Database schema with all token types
- [x] Migration with constraints
- [ ] OTP generation logic
- [ ] OTP verification logic
- [ ] Rate limiting
- [ ] Cleanup job

### **Phase 2 (3-6 months):**
- [ ] `:phone_verification`
- [ ] `:email_verification`
- [ ] `:coach_invitation`

### **Phase 3 (6-12 months):**
- [ ] `:account_deletion`
- [ ] `:business_transfer`
- [ ] `:payment_confirmation`
- [ ] `:session_verification`
- [ ] `:mfa_setup`
- [ ] `:mfa_login`

---

## 🎯 **Usage Examples**

### **Backend: Creating Authentication Token**

```elixir
def request_authentication_otp(email) do
  secret = NimbleTOTP.secret()
  otp_code = NimbleTOTP.verification_code(secret)

  {:ok, token} = %OneTimeToken{}
    |> OneTimeToken.changeset(%{
      token_type: :authentication,
      secret: secret,
      relates_to_email: email,
      expires_at: DateTime.utc_now() |> DateTime.add(15, :minute)
    })
    |> Repo.insert()

  Mailer.send_otp_email(email, otp_code)
  
  {:ok, %{token_id: token.id}}
end
```

### **Backend: Verifying Token**

```elixir
def verify_otp(token_id, otp_code) do
  with {:ok, token} <- get_token(token_id),
       :ok <- validate_not_expired(token),
       :ok <- validate_not_used(token),
       :ok <- validate_otp_code(token.secret, otp_code) do
    
    # Handle based on token type
    case token.token_type do
      :authentication -> handle_authentication(token)
      :invitation_acceptance -> handle_invitation(token)
      _ -> {:error, :not_implemented}
    end
  end
end
```

---

## 📚 **Related Documentation**

- [API Structure](./API_STRUCTURE.md)
- [Authentication Flow](./AUTH_FLOW.md)
- [Database Schema](./DATABASE_SCHEMA.md)

---

**Last Updated:** 2025-11-05  
**Status:** Phase 1 (MVP) - Active  
**Version:** 1.0.0
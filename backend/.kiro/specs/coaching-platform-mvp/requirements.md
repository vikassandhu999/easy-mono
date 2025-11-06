# Requirements Document

## Introduction

This document defines the requirements for a coaching platform MVP that enables coaches to manage their clients and track progress. The system follows a multi-tenant architecture where businesses (coaching practices) can have multiple coaches who manage multiple clients. The platform handles authentication, organization management, coach profiles, and client relationship management.

## Glossary

- **System**: The coaching platform application
- **User**: An authenticated account holder in the system
- **Business**: An organization entity representing a coaching practice or company
- **Coach**: A user with a coach profile who provides coaching services within a business
- **Client**: A customer record managed by coaches within a business
- **Session**: An authenticated user session with JWT token
- **OneTimeToken**: A temporary token for authentication, email verification, or client invitation
- **OTP**: One-Time Password sent via email for passwordless authentication
- **Plan**: A subscription tier defining features and limits
- **Subscription**: An active billing relationship between a business and a plan

## Requirements

### Requirement 1: Coach Signup Flow - Initial Registration

**User Story:** As a new coach, I want to register with just my email and name, so that I can start the process of creating my coaching business

#### Acceptance Criteria

1. WHEN a coach submits valid registration data (email, full name), THE System SHALL create a new User record with email_verified set to false
2. WHEN a coach submits registration with an existing email, THE System SHALL return a validation error
3. WHEN a coach registers successfully, THE System SHALL create a OneTimeToken for email verification
4. WHEN a coach registers successfully, THE System SHALL send a verification email with OTP code
5. THE System SHALL generate a 6-digit numeric OTP code

### Requirement 2: Coach Signup Flow - Email Verification with OTP

**User Story:** As a newly registered coach, I want to verify my email with an OTP code, so that I can proceed to create my business

#### Acceptance Criteria

1. WHEN a coach submits valid OTP code, THE System SHALL mark the User email as verified
2. WHEN a coach submits invalid or expired OTP, THE System SHALL return an error
3. WHEN email verification succeeds, THE System SHALL create a Session and return JWT token
4. THE System SHALL set OneTimeToken expiration to 10 minutes from creation
5. THE System SHALL allow maximum 3 OTP verification attempts before requiring resend

### Requirement 3: Coach Signup Flow - Business Creation

**User Story:** As a verified coach user, I want to create my business profile, so that I can start managing my coaching practice

#### Acceptance Criteria

1. WHEN a verified coach creates a business with valid data (business name, description), THE System SHALL create a Business record
2. WHEN a business is created, THE System SHALL assign the creating user as the business owner
3. WHEN a business is created, THE System SHALL create a default free Plan if none exists
4. WHEN a business is created, THE System SHALL create an active Subscription linking Business to the default Plan
5. THE System SHALL enforce unique business names within the platform

### Requirement 4: Coach Signup Flow - Coach Profile Creation

**User Story:** As a business owner, I want to automatically have a coach profile created, so that I can immediately start managing clients

#### Acceptance Criteria

1. WHEN a business is created, THE System SHALL automatically create a Coach record for the owner
2. THE System SHALL link the Coach to both the User and the Business
3. THE System SHALL set the coach status to active
4. THE System SHALL allow the coach to update their profile with bio, specialties, and credentials later
5. WHEN coach profile creation completes, THE System SHALL return the complete onboarding status

### Requirement 5: Client Signup Flow - Invitation Creation

**User Story:** As a coach, I want to invite a client to join my business, so that they can access the platform and track their progress

#### Acceptance Criteria

1. WHEN a coach creates a client invitation with valid email, THE System SHALL create a Client record with pending status
2. WHEN a client invitation is created, THE System SHALL create a OneTimeToken for client signup
3. WHEN a client invitation is created, THE System SHALL send an invitation email with signup link
4. THE System SHALL link the Client to the Business context
5. THE System SHALL set OneTimeToken expiration to 7 days for client invitations

### Requirement 6: Client Signup Flow - Client Registration with OTP

**User Story:** As an invited client, I want to register my account using the invitation link, so that I can access my coach's platform

#### Acceptance Criteria

1. WHEN a client clicks invitation link with valid token, THE System SHALL validate the invitation and return client details
2. WHEN a client confirms registration, THE System SHALL send an OTP code to the client email
3. WHEN a client submits valid OTP code, THE System SHALL create a User record and link to existing Client record
4. WHEN client registration succeeds, THE System SHALL mark the Client status as active and create a Session
5. WHEN a client attempts to use an expired invitation token, THE System SHALL return an error

### Requirement 7: Client Signup Flow - Automatic Assignment

**User Story:** As a coach who invited a client, I want the client automatically assigned to me, so that I can immediately start coaching

#### Acceptance Criteria

1. WHEN a client completes registration, THE System SHALL create a coach-client assignment to the inviting coach
2. THE System SHALL store the assignment timestamp
3. WHEN a client logs in for the first time, THE System SHALL display their assigned coach information
4. THE System SHALL allow the client to be assigned to additional coaches later
5. WHEN assignment is created, THE System SHALL send a notification to the coach

### Requirement 8: OTP-Based Login for All Users

**User Story:** As either a coach or client, I want to log in using OTP sent to my email, so that I can access my dashboard securely without passwords

#### Acceptance Criteria

1. WHEN a user requests login with valid email, THE System SHALL create a OneTimeToken and send OTP code via email
2. WHEN a user submits valid OTP code, THE System SHALL create a Session and return a JWT token
3. THE System SHALL include user role information (coach, client, or both) in the JWT token
4. WHEN a user has both coach and client profiles, THE System SHALL return both roles in token claims
5. THE System SHALL enforce session expiration after 7 days of inactivity

### Requirement 9: OTP Resend and Rate Limiting

**User Story:** As a user, I want to request a new OTP if I didn't receive it, so that I can complete authentication

#### Acceptance Criteria

1. WHEN a user requests OTP resend, THE System SHALL invalidate previous OTP and create a new OneTimeToken
2. THE System SHALL enforce rate limiting of maximum 3 OTP requests per email per 15 minutes
3. WHEN rate limit is exceeded, THE System SHALL return an error with retry-after time
4. THE System SHALL send OTP resend confirmation email
5. THE System SHALL log all OTP generation attempts for security monitoring

### Requirement 5: Subscription Management

**User Story:** As a business owner, I want to subscribe to a plan, so that I can access platform features based on my tier

#### Acceptance Criteria

1. THE System SHALL provide at least one default Plan with defined limits
2. WHEN a business owner selects a plan, THE System SHALL create a Subscription record linking Business to Plan
3. WHEN a subscription is created, THE System SHALL set the subscription status to active
4. THE System SHALL store subscription start date and billing cycle information
5. WHEN a business has no active subscription, THE System SHALL restrict access to premium features

### Requirement 6: Coach Profile Management

**User Story:** As a user within a business, I want to create a coach profile, so that I can provide coaching services and manage clients

#### Acceptance Criteria

1. WHEN a user with business access creates a coach profile, THE System SHALL create a Coach record linked to User and Business
2. THE System SHALL store coach-specific data including bio, specialties, and credentials
3. WHEN a coach profile is created, THE System SHALL set the coach status to active
4. THE System SHALL allow a user to have multiple coach profiles across different businesses

### Requirement 7: Client Management

**User Story:** As a coach, I want to add and manage client records, so that I can track my coaching relationships

#### Acceptance Criteria

1. WHEN a coach creates a client with valid data (name, email, phone), THE System SHALL create a Client record
2. THE System SHALL link the Client to the Business context
3. THE System SHALL store client contact information and notes
4. WHEN a coach lists clients, THE System SHALL return only clients within their business
5. THE System SHALL allow multiple coaches within a business to access the same client records

### Requirement 8: Client Assignment

**User Story:** As a business owner or coach, I want to assign clients to specific coaches, so that I can organize coaching relationships

#### Acceptance Criteria

1. THE System SHALL maintain a many-to-many relationship between Coaches and Clients
2. WHEN a coach is assigned to a client, THE System SHALL create an assignment record with timestamp
3. WHEN listing a coach's clients, THE System SHALL return all assigned clients
4. THE System SHALL allow a client to be assigned to multiple coaches simultaneously

### Requirement 9: Authorization and Access Control

**User Story:** As a system administrator, I want to enforce access control rules, so that users can only access data within their authorized scope

#### Acceptance Criteria

1. WHEN a user accesses business data, THE System SHALL verify the user belongs to that business
2. WHEN a coach accesses client data, THE System SHALL verify the client belongs to the coach's business
3. WHEN a non-owner user attempts owner-only actions, THE System SHALL return an authorization error
4. THE System SHALL enforce row-level security based on business context

### Requirement 10: OAuth-Style Token Endpoints

**User Story:** As a client application, I want OAuth 2.0-style token endpoints, so that I can use standard authentication patterns

#### Acceptance Criteria

1. THE System SHALL provide POST /oauth/token endpoint as the primary authentication endpoint
2. THE System SHALL support grant_type parameter with values: otp, refresh_token
3. WHEN grant_type is otp, THE System SHALL require email and code parameters
4. WHEN grant_type is refresh_token, THE System SHALL require refresh_token parameter
5. THE System SHALL return access_token, refresh_token, token_type (Bearer), and expires_in

### Requirement 11: OAuth-Style Authorization Endpoints

**User Story:** As a client application, I want OAuth-style authorization endpoints for initiating authentication, so that I follow standard OAuth flows

#### Acceptance Criteria

1. THE System SHALL provide POST /oauth/authorize endpoint for initiating OTP authentication
2. WHEN /oauth/authorize receives email parameter, THE System SHALL send OTP code and return verification_pending status
3. THE System SHALL provide POST /oauth/revoke endpoint for token revocation
4. WHEN /oauth/revoke receives token, THE System SHALL invalidate the access and refresh tokens
5. THE System SHALL provide GET /oauth/userinfo endpoint returning current user profile (requires Bearer token)

### Requirement 12: API Endpoints for Coach Signup Flow

**User Story:** As a client application, I want RESTful API endpoints for coach onboarding, so that I can implement the OTP-based coach signup flow

#### Acceptance Criteria

1. THE System SHALL provide POST /api/auth/register endpoint accepting email and full_name
2. WHEN registration succeeds, THE System SHALL send OTP code and return user_id and verification_pending status
3. THE System SHALL provide POST /oauth/token with grant_type=otp for completing registration verification
4. THE System SHALL provide POST /api/onboarding/business endpoint for creating business (requires Bearer token)
5. WHEN business creation succeeds, THE System SHALL return business, coach profile, and subscription details

### Requirement 13: API Endpoints for Client Signup Flow

**User Story:** As a client application, I want RESTful API endpoints for client onboarding, so that I can implement the OTP-based client invitation flow

#### Acceptance Criteria

1. THE System SHALL provide POST /api/clients/invite endpoint accepting email, full_name, and optional client details
2. THE System SHALL provide GET /api/invitations/:token endpoint for validating invitation tokens and returning client details
3. THE System SHALL provide POST /api/invitations/:token/accept endpoint for initiating client registration
4. WHEN invitation is accepted, THE System SHALL send OTP code and return verification_pending status
5. THE System SHALL provide POST /oauth/token with grant_type=otp and invitation_token for completing client verification

### Requirement 14: OTP Delivery and Management

**User Story:** As a system, I want to manage OTP lifecycle, so that authentication is secure and user-friendly

#### Acceptance Criteria

1. THE System SHALL provide POST /oauth/authorize endpoint with resend=true parameter for OTP resend
2. WHEN OTP is requested, THE System SHALL invalidate any previous unused OTP for that email
3. THE System SHALL enforce rate limiting of maximum 3 OTP requests per email per 15 minutes
4. THE System SHALL return rate_limit_exceeded error with retry_after seconds when limit is exceeded
5. THE System SHALL log all OTP generation and verification attempts for security monitoring

### Requirement 15: API Endpoints for Business Management

**User Story:** As a client application, I want RESTful API endpoints for business operations, so that coaches can manage their practice

#### Acceptance Criteria

1. THE System SHALL provide GET /api/businesses/:id endpoint for retrieving business details
2. THE System SHALL provide PATCH /api/businesses/:id endpoint for updating business information
3. THE System SHALL provide GET /api/businesses/:id/coaches endpoint for listing business coaches
4. THE System SHALL provide GET /api/businesses/:id/clients endpoint for listing business clients with pagination
5. THE System SHALL provide GET /api/businesses/:id/subscription endpoint for retrieving subscription details

### Requirement 16: API Endpoints for Coach Management

**User Story:** As a client application, I want RESTful API endpoints for coach operations, so that coach profiles can be managed

#### Acceptance Criteria

1. THE System SHALL provide GET /api/coaches/:id endpoint for retrieving coach details
2. THE System SHALL provide PATCH /api/coaches/:id endpoint for updating coach profile (bio, specialties, credentials)
3. THE System SHALL provide GET /api/coaches/:id/clients endpoint for listing assigned clients
4. THE System SHALL provide POST /api/coaches/:id/clients/:client_id/assign endpoint for manual client assignment
5. THE System SHALL provide DELETE /api/coaches/:id/clients/:client_id/unassign endpoint for removing assignments

### Requirement 17: API Endpoints for Client Management

**User Story:** As a client application, I want RESTful API endpoints for client operations, so that coaches can manage their clients

#### Acceptance Criteria

1. THE System SHALL provide GET /api/clients/:id endpoint for retrieving client details
2. THE System SHALL provide PATCH /api/clients/:id endpoint for updating client information
3. THE System SHALL provide GET /api/clients endpoint for listing clients with pagination and filtering
4. THE System SHALL provide GET /api/clients/:id/coaches endpoint for listing assigned coaches
5. THE System SHALL provide PATCH /api/clients/:id/status endpoint for updating client status (active, inactive, archived)

### Requirement 18: Authorization and Access Control

**User Story:** As a system administrator, I want to enforce access control rules, so that users can only access data within their authorized scope

#### Acceptance Criteria

1. WHEN a coach accesses business data, THE System SHALL verify the coach belongs to that business
2. WHEN a coach accesses client data, THE System SHALL verify the client belongs to the coach's business
3. WHEN a client accesses their data, THE System SHALL verify the client owns that record
4. WHEN a non-owner user attempts owner-only actions, THE System SHALL return an authorization error
5. THE System SHALL enforce row-level security based on business context for all queries

### Requirement 19: OAuth Error Responses

**User Story:** As a client application, I want OAuth 2.0-compliant error responses, so that I can handle errors using standard OAuth patterns

#### Acceptance Criteria

1. THE System SHALL return error responses with error and error_description fields per OAuth 2.0 spec
2. WHEN OTP is invalid, THE System SHALL return error=invalid_grant with appropriate description
3. WHEN rate limit is exceeded, THE System SHALL return error=slow_down with retry_after in error_description
4. WHEN token is expired, THE System SHALL return error=invalid_token with WWW-Authenticate header
5. THE System SHALL return HTTP 400 for OAuth token endpoint errors per RFC 6749

### Requirement 20: Data Validation

**User Story:** As a system administrator, I want comprehensive data validation, so that data integrity is maintained

#### Acceptance Criteria

1. THE System SHALL validate email format using standard email regex
2. THE System SHALL validate phone numbers using international format validation
3. THE System SHALL enforce required fields for all entity creation
4. THE System SHALL return structured validation errors with field-level details
5. THE System SHALL sanitize user input to prevent injection attacks

### Requirement 21: Standard HTTP Error Handling

**User Story:** As a client application, I want consistent HTTP error responses, so that I can handle errors appropriately

#### Acceptance Criteria

1. THE System SHALL return HTTP 400 for validation errors with detailed messages
2. THE System SHALL return HTTP 401 for authentication failures with WWW-Authenticate header
3. THE System SHALL return HTTP 403 for authorization failures
4. THE System SHALL return HTTP 404 for resource not found errors
5. THE System SHALL return HTTP 500 for internal server errors with sanitized messages

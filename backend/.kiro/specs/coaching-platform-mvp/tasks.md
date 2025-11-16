# Implementation Plan

This document outlines the implementation tasks for the coaching platform MVP. Each task builds incrementally on previous tasks, with all code integrated and functional at each step.

## Task List

- [x] 1. Database schema and migrations
  - Create migrations for all tables (users, one_time_tokens, sessions, plans, businesses, subscriptions, coaches, clients, coach_client_assignments)
  - Add indexes for performance optimization
  - Create seed data for default plan
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1_

- [ ] 2. Easy.Accounts context - User management
  - [x] 2.1 Create User schema with validations
    - Define User schema with email, full_name, email_verified fields
    - Add changeset validations (email format, required fields, unique email)
    - _Requirements: 1.1, 1.2_
  
  - [x] 2.2 Implement User CRUD functions
    - Implement create_user/1, get_user/1, get_user_by_email/1
    - Implement mark_email_verified/1, update_user/2, email_taken?/1
    - _Requirements: 1.1, 2.1_

- [x] 3. Easy.Accounts context - OTP management
  - [x] 3.1 Create OneTimeToken schema
    - Define OneTimeToken schema with token, code, type, email, expires_at fields
    - Add changeset validations and code hashing logic
    - _Requirements: 1.3, 1.4, 2.1, 5.2, 5.3_
  
  - [x] 3.2 Implement OTP generation and verification
    - Implement generate_otp/3 to create OTP and send email
    - Implement verify_otp/3 to validate OTP code with attempt tracking
    - Implement resend_otp/2 to invalidate old OTP and create new one
    - _Requirements: 1.4, 2.1, 2.2, 2.5, 9.1, 9.2_
  
  - [x] 3.3 Implement rate limiting for OTP requests
    - Implement check_rate_limit/1 using ETS or database
    - Enforce 3 requests per 15 minutes limit
    - _Requirements: 9.2, 9.3, 14.3_

- [x] 4. Easy.Accounts context - Session management
  - [x] 4.1 Create Session schema
    - Define Session schema with token, refresh_token, expires_at fields
    - Add changeset validations
    - _Requirements: 8.2, 8.5_
  
  - [x] 4.2 Implement JWT token generation using Joken
    - Configure Joken with RS256 signing
    - Implement create_session/1 to generate access and refresh tokens
    - Include user roles in JWT claims
    - _Requirements: 8.2, 8.3, 8.4, 10.5_
  
  - [x] 4.3 Implement session refresh and revocation
    - Implement refresh_session/1 to validate refresh token and issue new access token
    - Implement revoke_session/1 and revoke_all_user_sessions/1
    - _Requirements: 10.4, 11.4_

- [x] 5. Easy.Accounts context - Authentication flows
  - [x] 5.1 Implement coach registration flow
    - Implement register_user/2 to create user and send verification OTP
    - Implement verify_and_login/2 to verify OTP, mark email verified, create session
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 12.1, 12.2_
  
  - [x] 5.2 Implement login flow
    - Implement request_login_otp/1 to send OTP to existing user
    - Implement login_with_otp/2 to verify OTP and create session
    - _Requirements: 8.1, 8.2, 11.1, 11.2_

- [x] 6. Easy.Organizations context
  - [x] 6.1 Create Plan and Subscription schemas
    - Define Plan schema with name, slug, price_cents, limits fields
    - Define Subscription schema with status, started_at, period fields
    - Add changeset validations
    - _Requirements: 3.3, 3.4_
  
  - [x] 6.2 Create Business schema
    - Define Business schema with name, description, slug, owner_id fields
    - Add changeset validations and slug generation
    - _Requirements: 3.1, 3.5_
  
  - [x] 6.3 Implement business and subscription management
    - Implement create_business/2 to create business with owner
    - Implement get_or_create_default_plan/0
    - Implement create_subscription/2 to link business to plan
    - Implement get_business/1, update_business/2, get_subscription/1
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 15.1, 15.2, 15.5_

- [x] 7. Easy.Organizations context
  - [x] 7.1 Create Coach schema
    - Define Coach schema with bio, specialties, credentials, status fields
    - Add changeset validations and unique constraint on user_id + business_id
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [x] 7.2 Implement coach management functions
    - Implement create_coach/3 to create coach profile
    - Implement get_coach/1, update_coach/2
    - Implement list_coach_clients/1
    - _Requirements: 4.1, 4.2, 4.4, 16.1, 16.2, 16.3_
  
  - [x] 7.3 Implement coach-client assignment
    - Implement assign_client/2 and unassign_client/2
    - _Requirements: 8.1, 8.2, 16.4, 16.5_

- [x] 8. Easy.Clients context
  - [x] 8.1 Create Client and CoachClientAssignment schemas
    - Define Client schema with email, full_name, phone, notes, status fields
    - Define CoachClientAssignment schema for many-to-many relationship
    - Add changeset validations
    - _Requirements: 5.1, 5.4, 7.1, 7.2, 8.1_
  
  - [x] 8.2 Implement client invitation flow
    - Implement create_invitation/2 to create client with pending status and invitation token
    - Implement get_invitation/1 to validate invitation token
    - Implement accept_invitation/1 to send OTP for client registration
    - _Requirements: 5.1, 5.2, 5.3, 5.5, 6.1, 6.2, 13.1, 13.2, 13.3_
  
  - [x] 8.3 Implement client registration completion
    - Implement complete_client_registration/3 to verify OTP, create user, link to client, activate client
    - Automatically create coach-client assignment to inviting coach
    - _Requirements: 6.3, 6.4, 7.1, 7.2, 13.4, 13.5_
  
  - [x] 8.4 Implement client management functions
    - Implement get_client/1, update_client/2, update_client_status/2
    - Implement list_clients/2 with pagination and filtering
    - Implement list_client_coaches/1
    - _Requirements: 7.3, 7.4, 7.5, 17.1, 17.2, 17.3, 17.4, 17.5_

- [x] 9. OAuth endpoints
  - [x] 9.1 Create OAuthController with /oauth/token endpoint
    - Implement POST /oauth/token with grant_type=otp support
    - Implement POST /oauth/token with grant_type=refresh_token support
    - Return OAuth-compliant token response
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  
  - [x] 9.2 Create /oauth/authorize endpoint
    - Implement POST /oauth/authorize to initiate OTP authentication
    - Support resend=true parameter for OTP resend
    - Return verification_pending status
    - _Requirements: 11.1, 11.2, 14.1_
  
  - [x] 9.3 Create /oauth/revoke and /oauth/userinfo endpoints
    - Implement POST /oauth/revoke for token revocation
    - Implement GET /oauth/userinfo to return current user profile
    - _Requirements: 11.3, 11.4, 11.5_

- [x] 10. Authentication API endpoints
  - [x] 10.1 Create AuthController with /api/auth/register endpoint
    - Implement POST /api/auth/register for coach registration
    - Return user_id and verification_pending status
    - _Requirements: 12.1, 12.2_
  
  - [x] 10.2 Create authentication plugs
    - Implement EnsureAuthenticated plug to verify Bearer token
    - Implement LoadCurrentUser plug to load user from JWT claims
    - Add plugs to router pipeline
    - _Requirements: 18.1, 18.2, 18.3, 18.4_

- [x] 11. Onboarding API endpoints
  - [x] 11.1 Create OnboardingController with /api/onboarding/business endpoint
    - Implement POST /api/onboarding/business (requires authentication)
    - Create business, default subscription, and coach profile in transaction
    - Return business, coach, and subscription details
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.5, 12.4, 12.5_

- [x] 12. Business API endpoints
  - [x] 12.1 Create BusinessController
    - Implement GET /api/businesses/:id with authorization check
    - Implement PATCH /api/businesses/:id with owner authorization
    - Implement GET /api/businesses/:id/coaches
    - Implement GET /api/businesses/:id/clients with pagination
    - Implement GET /api/businesses/:id/subscription
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 18.1, 18.2_

- [x] 13. Coach API endpoints
  - [x] 13.1 Create CoachController
    - Implement GET /api/coaches/:id with authorization check
    - Implement PATCH /api/coaches/:id with ownership authorization
    - Implement GET /api/coaches/:id/clients
    - Implement POST /api/coaches/:id/clients/:client_id/assign
    - Implement DELETE /api/coaches/:id/clients/:client_id/unassign
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 18.1, 18.2_

- [x] 14. Client API endpoints
  - [x] 14.1 Create ClientController for invitations
    - Implement POST /api/clients/invite with coach authorization
    - Implement GET /api/invitations/:token for public invitation validation
    - Implement POST /api/invitations/:token/accept for initiating client registration
    - _Requirements: 13.1, 13.2, 13.3, 13.4_
  
  - [x] 14.2 Create client management endpoints
    - Implement GET /api/clients/:id with authorization check
    - Implement PATCH /api/clients/:id with coach authorization
    - Implement GET /api/clients with pagination and business filtering
    - Implement GET /api/clients/:id/coaches
    - Implement PATCH /api/clients/:id/status
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 18.1, 18.2_

- [x] 15. Error handling and validation
  - [x] 15.1 Implement OAuth error responses
    - Create error response helpers for OAuth endpoints
    - Return error and error_description per RFC 6749
    - Handle invalid_grant, invalid_token, slow_down errors
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_
  
  - [x] 15.2 Implement standard API error responses
    - Create error response helpers for API endpoints
    - Return structured errors with message, code, and details
    - Handle validation errors with field-level details
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 21.1, 21.2, 21.3, 21.4, 21.5_
  
  - [x] 15.3 Add error handling to all controllers
    - Add error handling for validation errors (400)
    - Add error handling for authentication errors (401)
    - Add error handling for authorization errors (403)
    - Add error handling for not found errors (404)
    - Add error handling for rate limit errors (429)
    - _Requirements: 21.1, 21.2, 21.3, 21.4_

- [ ] 16. Email templates and delivery
  - [x] 16.1 Create email templates
    - Create OTP verification email template
    - Create client invitation email template
    - Create login OTP email template
    - _Requirements: 1.4, 5.3, 8.1_
  
  - [x] 16.2 Configure email delivery
    - Configure Swoosh adapter (Postmark or similar)
    - Implement async email sending
    - Add email delivery error handling
    - _Requirements: 1.4, 5.3, 8.1_

- [x] 17. Authorization helpers
  - [x] 17.1 Implement business authorization helpers
    - Create helper to verify user belongs to business
    - Create helper to verify user is business owner
    - _Requirements: 18.1, 18.2, 18.4, 18.5_
  
  - [x] 17.2 Implement coach authorization helpers
    - Create helper to verify user is coach in business
    - Create helper to verify coach can access client
    - _Requirements: 18.1, 18.2, 18.5_
  
  - [x] 17.3 Implement client authorization helpers
    - Create helper to verify user is client
    - Create helper to verify client belongs to business
    - _Requirements: 18.3, 18.5_

- [x] 18. Router configuration
  - [x] 18.1 Configure OAuth routes
    - Add /oauth/token, /oauth/authorize, /oauth/revoke, /oauth/userinfo routes
    - Configure CORS for OAuth endpoints
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 11.1, 11.2, 11.3, 11.4, 11.5_
  
  - [x] 18.2 Configure API routes with authentication
    - Add /api/auth/register route (public)
    - Add /api/onboarding/* routes (authenticated)
    - Add /api/businesses/* routes (authenticated)
    - Add /api/coaches/* routes (authenticated)
    - Add /api/clients/* routes (authenticated and public for invitations)
    - Configure authentication pipeline
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 13.1, 13.2, 13.3, 13.4, 13.5, 15.1, 15.2, 15.3, 15.4, 15.5, 16.1, 16.2, 16.3, 16.4, 16.5, 17.1, 17.2, 17.3, 17.4, 17.5_

- [x] 19. Configuration and environment setup
  - [x] 19.1 Configure application settings
    - Add OTP expiration, rate limiting, and JWT settings to config
    - Configure Guardian for JWT token management
    - Add environment-specific configurations
    - _Requirements: 2.4, 2.5, 8.5, 9.2, 9.3, 14.3, 14.4_
  
  - [x] 19.2 Add configuration documentation
    - Document required environment variables
    - Document configuration options
    - _Requirements: All_

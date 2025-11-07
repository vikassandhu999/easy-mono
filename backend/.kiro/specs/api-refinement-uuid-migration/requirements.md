# Requirements Document

## Introduction

This specification defines the requirements for refining the coaching platform MVP APIs to follow best practices and improve security. The refinement includes migrating all primary and foreign keys from integer IDs to UUIDs, making authentication flows more explicit with token-based references, and streamlining multi-step user journeys (coach registration and client invitation) to reduce API chattiness while maintaining clarity.

## Glossary

- **System**: The coaching platform web application
- **UUID**: Universally Unique Identifier, a 128-bit identifier used as primary and foreign keys
- **OneTimeToken**: A database record containing a UUID token, OTP code, expiration, and metadata for authentication flows
- **OTP**: One-Time Password, a 6-digit code sent via email for verification
- **Coach Registration Flow**: The multi-step process from initial signup through business creation
- **Client Invitation Flow**: The multi-step process from invitation creation through client signup and assignment
- **Token ID**: The UUID identifier of a OneTimeToken record, used to reference authentication state
- **API Chattiness**: The number of round-trip requests required to complete a user flow

## Requirements

### Requirement 1: UUID Primary Keys

**User Story:** As a platform architect, I want all database entities to use UUIDs as primary keys, so that the system has globally unique identifiers that don't expose sequential information.

#### Acceptance Criteria

1. WHEN THE System creates a new database record, THE System SHALL generate a UUID as the primary key
2. THE System SHALL use UUID type for all primary key columns in database migrations
3. THE System SHALL use UUID type for all foreign key columns in database migrations
4. THE System SHALL NOT use integer-based primary or foreign keys for any entity
5. WHEN THE System returns entity data in API responses, THE System SHALL include the UUID identifier

### Requirement 2: Explicit Token-Based Authentication

**User Story:** As a security engineer, I want authentication flows to use explicit token references instead of exposing user IDs, so that authentication state is clearly separated from user identity.

#### Acceptance Criteria

1. WHEN THE System generates an OTP for authentication, THE System SHALL return the OneTimeToken UUID (token_id) in the API response
2. THE System SHALL NOT return user_id in OTP generation responses
3. WHEN THE System receives an OTP verification request, THE System SHALL require the token_id as a parameter
4. THE System SHALL validate that the provided OTP code matches the OneTimeToken identified by token_id
5. WHEN THE System successfully verifies an OTP, THE System SHALL mark the OneTimeToken as used with a timestamp

### Requirement 3: Streamlined Coach Registration Flow

**User Story:** As a coach, I want a clear and efficient registration process from signup to business creation, so that I can quickly start using the platform without confusion.

#### Acceptance Criteria

1. WHEN a coach initiates registration, THE System SHALL accept email and full_name in a single request
2. THE System SHALL create a User record and generate an email verification OTP in one operation
3. THE System SHALL return a token_id referencing the verification OneTimeToken
4. WHEN the coach submits the OTP with token_id, THE System SHALL verify the code, mark the email as verified, create a session, and return authentication tokens
5. WHEN an authenticated coach creates a business, THE System SHALL create the Business record and automatically create a Coach profile linking the user to the business
6. THE System SHALL return the complete business and coach profile data after business creation
7. THE System SHALL NOT require more than 3 API calls to complete the full coach registration flow (register, verify OTP, create business)

### Requirement 4: Streamlined Client Invitation Flow

**User Story:** As a coach, I want to invite clients efficiently, so that they can join my coaching practice with minimal friction.

#### Acceptance Criteria

1. WHEN a coach creates a client invitation, THE System SHALL accept client email, full_name, phone, and notes in a single request
2. THE System SHALL create a Client record with pending status and generate an invitation OneTimeToken with 7-day expiration
3. THE System SHALL return the invitation token_id in the response
4. THE System SHALL send an invitation email containing a link with the token_id
5. WHEN a client accesses the invitation link, THE System SHALL validate the token_id and return client and business information without requiring authentication
6. WHEN the client accepts the invitation, THE System SHALL generate a registration OTP and return a verification token_id
7. WHEN the client submits the OTP with verification token_id, THE System SHALL verify the code, create a User account, link the User to the Client record, activate the Client status, assign the Client to the inviting Coach, create a session, and return authentication tokens
8. THE System SHALL NOT require more than 3 API calls from the client's perspective (view invitation, accept invitation, verify OTP)

### Requirement 5: Non-Chatty API Design

**User Story:** As a frontend developer, I want API endpoints that return complete data in single responses, so that I can build responsive user interfaces without multiple sequential requests.

#### Acceptance Criteria

1. WHEN THE System returns authentication data, THE System SHALL include user profile, roles, and session information in a single response
2. WHEN THE System creates a business, THE System SHALL return the business data with the associated coach profile in a single response
3. WHEN THE System completes client registration, THE System SHALL return user data, client profile, assigned coaches, and session information in a single response
4. THE System SHALL use database preloading to include related entities in responses
5. THE System SHALL NOT require clients to make additional requests to fetch related data that is commonly needed together

### Requirement 6: Database Migration Strategy

**User Story:** As a database administrator, I want a safe migration path from integer IDs to UUIDs, so that the system can transition without data loss or extended downtime.

#### Acceptance Criteria

1. THE System SHALL provide migration scripts that add UUID columns to existing tables
2. THE System SHALL provide migration scripts that populate UUID columns with generated values
3. THE System SHALL provide migration scripts that update foreign key references to use UUIDs
4. THE System SHALL provide migration scripts that drop old integer ID columns after UUID migration is complete
5. THE System SHALL execute migrations in a transaction where possible to ensure data consistency
6. WHEN a migration fails, THE System SHALL rollback changes to maintain database integrity

### Requirement 7: Backward Compatibility During Migration

**User Story:** As a system operator, I want the application to handle both integer and UUID identifiers during the migration period, so that the system remains operational during the transition.

#### Acceptance Criteria

1. WHILE the migration is in progress, THE System SHALL accept both integer IDs and UUIDs in API requests
2. WHILE the migration is in progress, THE System SHALL return UUIDs in all API responses
3. WHEN the migration is complete, THE System SHALL only accept UUIDs in API requests
4. THE System SHALL log warnings when integer IDs are used during the migration period
5. THE System SHALL provide configuration to disable integer ID support after migration completion

### Requirement 8: API Response Consistency

**User Story:** As an API consumer, I want consistent response formats across all endpoints, so that I can reliably parse and handle API responses.

#### Acceptance Criteria

1. WHEN THE System returns success responses, THE System SHALL use a consistent JSON structure with data and metadata fields
2. WHEN THE System returns error responses, THE System SHALL use a consistent JSON structure with error type, message, and details fields
3. THE System SHALL use consistent field naming conventions (snake_case) across all API responses
4. THE System SHALL include timestamps in ISO 8601 format with UTC timezone
5. THE System SHALL include pagination metadata when returning lists of entities

### Requirement 9: Token Expiration and Cleanup

**User Story:** As a security engineer, I want expired tokens to be automatically cleaned up, so that the database doesn't accumulate stale authentication data.

#### Acceptance Criteria

1. THE System SHALL mark OneTimeToken records as expired when the expires_at timestamp is in the past
2. THE System SHALL reject OTP verification attempts for expired tokens
3. THE System SHALL provide a background job that deletes OneTimeToken records older than the configured retention period
4. THE System SHALL provide a background job that deletes Session records older than the configured retention period
5. THE System SHALL log token cleanup operations for audit purposes

### Requirement 10: Rate Limiting with Token Context

**User Story:** As a security engineer, I want rate limiting to consider token context, so that legitimate users aren't blocked while preventing abuse.

#### Acceptance Criteria

1. WHEN THE System checks rate limits for OTP generation, THE System SHALL count requests per email address within the time window
2. THE System SHALL allow a maximum of 3 OTP requests per email address per 15-minute window
3. WHEN rate limit is exceeded, THE System SHALL return an error response with retry_after seconds
4. THE System SHALL reset the rate limit counter after the time window expires
5. THE System SHALL NOT count failed OTP verification attempts toward the generation rate limit

### Requirement 11: Simplified Authentication Endpoints

**User Story:** As a frontend developer, I want simple, purpose-built authentication endpoints instead of OAuth complexity, so that I can integrate authentication flows easily without understanding OAuth specifications.

#### Acceptance Criteria

1. THE System SHALL provide simple REST endpoints for authentication instead of OAuth 2.0 endpoints
2. THE System SHALL provide POST /api/auth/send-otp endpoint that accepts email and returns token_id
3. THE System SHALL provide POST /api/auth/verify-otp endpoint that accepts token_id and code, returning session tokens
4. THE System SHALL provide POST /api/auth/refresh endpoint that accepts refresh_token and returns new access_token
5. THE System SHALL provide POST /api/auth/logout endpoint that accepts access_token and revokes the session
6. THE System SHALL remove OAuth-specific terminology (grant_type, bearer, etc.) from API contracts
7. THE System SHALL use simple JSON request/response formats without OAuth protocol overhead

### Requirement 12: OTP Verification Endpoint

**User Story:** As a frontend developer, I want a dedicated endpoint to verify OTP codes with token_id, so that I can complete authentication flows with explicit token references.

#### Acceptance Criteria

1. THE System SHALL provide a POST /api/auth/verify-otp endpoint that accepts token_id and code parameters
2. WHEN THE System receives a valid OTP verification request, THE System SHALL verify the code against the OneTimeToken identified by token_id
3. WHEN verification succeeds for email_verification type, THE System SHALL mark the email as verified, create a session, and return authentication tokens
4. WHEN verification succeeds for login type, THE System SHALL create a session and return authentication tokens
5. THE System SHALL return consistent error responses for invalid codes, expired tokens, and exceeded attempts
6. THE System SHALL NOT expose whether a user exists in error responses

### Requirement 13: Client Registration Completion Endpoint

**User Story:** As a client, I want a clear endpoint to complete my registration after accepting an invitation, so that I can verify my OTP and gain access to the platform.

#### Acceptance Criteria

1. THE System SHALL provide a POST /api/invitations/:token/complete endpoint that accepts code parameter
2. WHEN THE System receives a valid completion request, THE System SHALL verify the OTP code for the client_invitation type
3. WHEN verification succeeds, THE System SHALL create a User account, link it to the Client record, activate the Client, assign to the inviting Coach, and return authentication tokens
4. THE System SHALL return the complete user profile, client profile, and session data in a single response
5. THE System SHALL mark both the invitation token and OTP token as used after successful completion

### Requirement 14: Response Format Standardization

**User Story:** As an API consumer, I want all endpoints to return data in a consistent format, so that I can build reliable client applications.

#### Acceptance Criteria

1. THE System SHALL wrap success responses in a data object for consistency
2. THE System SHALL use snake_case for all JSON field names
3. THE System SHALL return UUIDs as strings without additional formatting
4. THE System SHALL include created_at and updated_at timestamps for all entities
5. THE System SHALL use ISO 8601 format with UTC timezone for all timestamps
6. WHEN THE System returns related entities, THE System SHALL nest them under descriptive keys (e.g., "user", "business", "coach")

### Requirement 15: Missing Validation for Token Types

**User Story:** As a security engineer, I want the system to validate that tokens are used for their intended purpose, so that tokens cannot be misused across different flows.

#### Acceptance Criteria

1. WHEN THE System verifies an OTP, THE System SHALL validate that the token type matches the expected flow
2. THE System SHALL reject email_verification tokens used in login flows
3. THE System SHALL reject login tokens used in email_verification flows
4. THE System SHALL reject client_invitation tokens used in coach registration flows
5. THE System SHALL return clear error messages indicating token type mismatch

### Requirement 16: Authorization Context in Responses

**User Story:** As a frontend developer, I want authentication responses to include user roles and permissions, so that I can render appropriate UI without additional API calls.

#### Acceptance Criteria

1. WHEN THE System creates a session after OTP verification, THE System SHALL include user roles in the response
2. THE System SHALL include coach_profile data if the user has a coach role
3. THE System SHALL include client_profile data if the user has a client role
4. THE System SHALL include business_ids that the user has access to
5. THE System SHALL preload and return related entities to minimize subsequent API calls

### Requirement 17: Invitation Token Metadata Validation

**User Story:** As a security engineer, I want invitation tokens to validate their metadata, so that tokens cannot be used to access unauthorized resources.

#### Acceptance Criteria

1. WHEN THE System processes a client invitation, THE System SHALL validate that the client_id in the token metadata matches the client being registered
2. THE System SHALL validate that the business_id in the token metadata matches the client's business
3. THE System SHALL validate that the inviting_coach_id exists and belongs to the same business
4. WHEN metadata validation fails, THE System SHALL reject the invitation and return an error
5. THE System SHALL log metadata validation failures for security auditing

### Requirement 18: Idempotency for Critical Operations

**User Story:** As a system operator, I want critical operations to be idempotent, so that network retries don't create duplicate resources.

#### Acceptance Criteria

1. WHEN THE System receives duplicate OTP generation requests within 60 seconds, THE System SHALL return the existing token_id instead of creating a new token
2. WHEN THE System receives duplicate business creation requests, THE System SHALL return the existing business instead of failing
3. WHEN THE System receives duplicate client invitation requests for the same email and business, THE System SHALL return the existing invitation
4. THE System SHALL use database constraints to prevent duplicate records
5. THE System SHALL return appropriate HTTP status codes (200 for existing, 201 for created)

### Requirement 19: Comprehensive Error Codes

**User Story:** As a frontend developer, I want machine-readable error codes, so that I can provide appropriate user feedback and handle errors programmatically.

#### Acceptance Criteria

1. THE System SHALL include a unique error code in every error response
2. THE System SHALL document all error codes in API documentation
3. THE System SHALL use consistent error code naming conventions (e.g., VALIDATION_ERROR, TOKEN_EXPIRED)
4. THE System SHALL include error details that help developers debug issues without exposing sensitive information
5. THE System SHALL distinguish between client errors (4xx) and server errors (5xx) with appropriate status codes

# Requirements Document

## Introduction

This document outlines the requirements for enhancing the JWT claims structure and authorization strategy in the coaching platform. The current system stores minimal information in JWT tokens (user_id, email, roles) and requires database lookups for authorization decisions. The enhanced system will embed tenant context (business_id, coach_id, client_id) directly in JWT claims and introduce an explicit scope/actor pattern for service method calls, enabling more efficient and explicit authorization checks.

## Glossary

- **JWT**: JSON Web Token used for authentication and authorization
- **Claims**: Data embedded within a JWT token
- **Scope**: A data structure representing the current actor (user + their active role context) making a request
- **Actor**: The entity (user with specific role context) performing an action in the system
- **Tenant**: A business organization that owns data and users in a multi-tenant system
- **Session**: An authenticated user session with associated JWT tokens
- **Access Token**: Short-lived JWT used for API authentication
- **Refresh Token**: Long-lived JWT used to obtain new access tokens
- **Authorization System**: The module responsible for verifying permissions and access control
- **Service Layer**: Business logic layer that processes requests (e.g., Easy.Accounts, Easy.Coaches, Easy.Clients)

## Requirements

### Requirement 1: Enhanced JWT Claims Structure

**User Story:** As a system architect, I want JWT tokens to include tenant context (business_id, coach_id, client_id) so that authorization decisions can be made without additional database queries.

#### Acceptance Criteria

1. WHEN the Token module generates an access token, THE Token module SHALL include business_id in the claims WHERE the user has a coach or client profile
2. WHEN the Token module generates an access token for a user with a coach profile, THE Token module SHALL include coach_id in the claims
3. WHEN the Token module generates an access token for a user with a client profile, THE Token module SHALL include client_id in the claims
4. WHEN a user has both coach and client profiles in the same business, THE Token module SHALL include both coach_id and client_id in the claims
5. WHEN a user has multiple coach profiles across different businesses, THE Token module SHALL generate separate tokens for each business context

### Requirement 2: Scope Data Structure

**User Story:** As a developer, I want a standardized scope structure passed to service methods so that I can explicitly identify which actor is performing an action and their authorization context.

#### Acceptance Criteria

1. THE System SHALL define a Scope struct containing user_id, business_id, coach_id, client_id, and roles fields
2. WHEN a request is authenticated, THE Authentication Plug SHALL extract claims from the JWT and construct a Scope struct
3. WHEN the Scope struct is constructed, THE Authentication Plug SHALL validate that all referenced IDs exist in the token claims
4. THE Scope struct SHALL be immutable once created
5. THE Scope struct SHALL provide helper functions to check actor type (is_coach?, is_client?, is_business_owner?)

### Requirement 3: Authentication Plug Enhancement

**User Story:** As a developer, I want the authentication plug to automatically create and inject a scope into the connection so that controllers and service methods have immediate access to the actor context.

#### Acceptance Criteria

1. WHEN a request contains a valid Bearer token, THE Authentication Plug SHALL verify the JWT and extract claims
2. WHEN JWT claims are extracted, THE Authentication Plug SHALL construct a Scope struct from the claims
3. WHEN the Scope struct is constructed, THE Authentication Plug SHALL assign it to conn.assigns.scope
4. WHEN JWT verification fails, THE Authentication Plug SHALL return an unauthorized error response
5. WHEN a protected route is accessed without a token, THE Authentication Plug SHALL return an unauthorized error response

### Requirement 4: Service Layer Scope Integration

**User Story:** As a developer, I want service methods to accept a scope parameter as the first argument so that authorization context is explicit and consistent across all service calls.

#### Acceptance Criteria

1. THE System SHALL update all service methods in Easy.Accounts, Easy.Coaches, Easy.Clients, and Easy.Organizations to accept scope as the first parameter
2. WHEN a service method requires authorization, THE service method SHALL use the scope parameter to make authorization decisions
3. WHEN a service method creates or queries data, THE service method SHALL automatically scope queries to the business_id from the scope WHERE applicable
4. WHEN a service method is called without proper scope, THE service method SHALL return an error indicating missing authorization context

### Requirement 5: Multi-Tenant Query Scoping

**User Story:** As a security engineer, I want all database queries to be automatically scoped to the user's business context so that data leakage between tenants is prevented.

#### Acceptance Criteria

1. WHEN a service method queries coaches, THE service method SHALL filter by scope.business_id
2. WHEN a service method queries clients, THE service method SHALL filter by scope.business_id
3. WHEN a service method queries business data, THE service method SHALL verify the user has access to the business_id in scope
4. THE System SHALL provide query helper functions that automatically apply business_id filters
5. WHEN a query attempts to access data outside the scope's business_id, THE System SHALL return an empty result or authorization error

### Requirement 6: Authorization Module Refactoring

**User Story:** As a developer, I want the Authorization module to work with scope objects instead of user objects so that authorization checks are more efficient and explicit.

#### Acceptance Criteria

1. THE Authorization module SHALL provide functions that accept scope as the primary parameter
2. WHEN checking business ownership, THE Authorization module SHALL compare scope.user_id with business.owner_id
3. WHEN checking coach permissions, THE Authorization module SHALL use scope.coach_id and scope.business_id
4. WHEN checking client permissions, THE Authorization module SHALL use scope.client_id and scope.business_id

### Requirement 7: Session Creation with Business Context

**User Story:** As a user, I want to select which business context I'm operating in when I have multiple roles so that my session is scoped to the appropriate tenant.

#### Acceptance Criteria

1. WHEN a user with multiple coach profiles logs in, THE System SHALL allow the user to specify which business_id to use for the session
2. WHEN a user has both coach and client profiles in the same business, THE System SHALL include both contexts in the token claims
3. WHEN creating a session, THE Accounts module SHALL determine the appropriate business_id based on user profiles
4. WHEN a user has only one business context, THE System SHALL automatically use that business_id
5. WHEN a user has no business context (new user), THE System SHALL create a token without business_id until a profile is created

### Requirement 8: Token Refresh with Scope Preservation

**User Story:** As a user, I want my business context to be preserved when refreshing my access token so that I don't lose my current working context.

#### Acceptance Criteria

1. WHEN a refresh token is used, THE Token module SHALL preserve the business_id from the original session
2. WHEN a refresh token is used, THE Token module SHALL regenerate coach_id and client_id based on current user profiles
3. WHEN user profiles have changed since token issuance, THE Token module SHALL update the claims to reflect current state
4. WHEN a user's coach or client profile is deleted, THE Token module SHALL remove the corresponding ID from refreshed tokens
5. WHEN refreshing fails due to invalid context, THE System SHALL return an error requiring re-authentication

### Requirement 9: Controller Integration

**User Story:** As a developer, I want controllers to easily access the scope from the connection and pass it to service methods so that authorization context flows naturally through the request lifecycle.

#### Acceptance Criteria

1. WHEN a controller action is invoked, THE controller SHALL access scope via conn.assigns.scope
2. WHEN calling service methods, THE controller SHALL pass scope as the first argument
3. WHEN scope is missing from conn.assigns, THE controller SHALL return an unauthorized error
4. THE System SHALL provide helper functions to extract scope from conn
5. WHEN authorization fails in a service method, THE controller SHALL handle the error and return appropriate HTTP status codes

### Requirement 10: Business Context Selection API

**User Story:** As a user with multiple business contexts, I want an API endpoint to switch between my business contexts so that I can work with different organizations without re-authenticating.

#### Acceptance Criteria

1. THE System SHALL provide an API endpoint to switch business context for the current session
2. WHEN a user requests a context switch, THE System SHALL verify the user has access to the requested business_id
3. WHEN context switch is successful, THE System SHALL issue new access and refresh tokens with the new business context
4. WHEN a user attempts to switch to an unauthorized business, THE System SHALL return a forbidden error
5. THE System SHALL provide an endpoint to list all available business contexts for the current user

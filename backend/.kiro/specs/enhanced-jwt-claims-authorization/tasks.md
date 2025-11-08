# Implementation Plan

- [x] 1. Create Scope module and authentication infrastructure

  - Create `Easy.Auth.Scope` module with struct definition and helper functions
  - Implement `from_claims/1` to construct scope from JWT claims
  - Implement helper predicates: `is_coach?/1`, `is_client?/1`, `has_business_context?/1`, `can_act_as_coach?/1`, `can_act_as_client?/1`
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 2. Enhance Token module with business context

  - [x] 2.1 Update `generate_access_token/4` to accept business_context parameter

    - Modify function signature to accept `business_context` map with business_id, coach_id, client_id
    - Include business_id, coach_id, client_id in JWT claims when present
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 2.2 Update `generate_refresh_token/3` to accept business_context parameter

    - Modify function signature to accept `business_context` map
    - Include business_id in refresh token claims
    - _Requirements: 1.1, 8.1_

  - [x] 2.3 Add `extract_business_context/1` helper function
    - Extract business_id, coach_id, client_id from claims map
    - Return structured business context map
    - _Requirements: 1.1, 1.2, 1.3_

- [x] 3. Add business_id to sessions schema

  - [x] 3.1 Create database migration for sessions table

    - Add `business_id` column as binary_id (nullable)
    - Create index on business_id column
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 3.2 Update Session schema module
    - Add `business_id` field to schema definition
    - Update changeset to accept business_id
    - _Requirements: 7.1, 7.2, 7.3_

- [x] 4. Implement business context detection in session creation

  - [x] 4.1 Add `get_user_business_contexts/1` function

    - Query user's coach and client profiles
    - Return list of available business contexts with roles
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 4.2 Add `determine_business_context/1` helper function

    - Implement logic to auto-select business_id when user has single context
    - Return business context map with business_id, coach_id, client_id, roles
    - Handle users with no business context (return nil)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 4.3 Update `create_session/1` to use business context detection

    - Call `determine_business_context/1` to get context
    - Pass business context to token generation functions
    - Store business_id in session record
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 4.4 Add `create_session/2` with explicit business_id parameter
    - Validate user has access to specified business_id
    - Determine coach_id and client_id for the business
    - Pass business context to token generation functions
    - _Requirements: 7.1, 7.2_

- [x] 5. Implement token refresh with context preservation

  - [x] 5.1 Update `refresh_session/1` to preserve business context

    - Extract business_id from refresh token claims
    - Query current user profiles for the business
    - Regenerate coach_id and client_id based on current state
    - Generate new access token with updated context
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 5.2 Add validation for deleted profiles during refresh
    - Check if coach/client profiles still exist
    - Remove corresponding IDs from claims if profiles deleted
    - Return error if business context is no longer valid
    - _Requirements: 8.4, 8.5_

- [x] 6. Create authentication plug

  - [x] 6.1 Create `EasyWeb.Plugs.AuthenticateToken` module

    - Implement `init/1` and `call/2` functions
    - Extract Bearer token from Authorization header
    - _Requirements: 3.1, 3.5_

  - [x] 6.2 Implement JWT verification in plug

    - Call `Token.verify_token/1` to verify JWT
    - Handle verification errors (invalid, expired, malformed)
    - Return 401 Unauthorized on verification failure
    - _Requirements: 3.1, 3.4, 3.5_

  - [x] 6.3 Implement scope construction in plug
    - Extract claims from verified JWT
    - Call `Scope.from_claims/1` to construct scope
    - Assign scope to `conn.assigns.scope`
    - _Requirements: 3.2, 3.3_

- [x] 7. Refactor Authorization module for scope-based checks

  - [x] 7.1 Update business authorization functions

    - Implement `authorize_business_access/2` using scope.business_id
    - Implement `authorize_business_owner/2` using scope.user_id
    - _Requirements: 6.1, 6.2_

  - [x] 7.2 Update coach authorization functions

    - Implement `authorize_coach_access/2` using scope.coach_id
    - Implement `authorize_coach_in_business/1` using scope.business_id and scope.coach_id
    - _Requirements: 6.1, 6.3_

  - [x] 7.3 Update client authorization functions

    - Implement `authorize_client_access/2` using scope.client_id
    - Implement `authorize_client_in_business/1` using scope.business_id and scope.client_id
    - _Requirements: 6.1, 6.4_

  - [x] 7.4 Add cross-entity authorization functions
    - Implement `authorize_coach_client_access/2` to verify coach and client in same business
    - _Requirements: 6.1_

- [x] 8. Refactor Accounts context for scope-based operations

  - [x] 8.1 Update user management functions

    - Update `get_user/2` to accept scope and verify access
    - Update `update_user/3` to accept scope and verify ownership
    - _Requirements: 4.1, 4.2_

  - [x] 8.2 Update session management functions
    - Update `revoke_session/2` to accept scope
    - Update `revoke_all_user_sessions/2` to accept scope and verify ownership
    - _Requirements: 4.1, 4.2_

- [x] 9. Refactor Coaches context for scope-based operations

  - [x] 9.1 Update coach query functions

    - Update `list_coaches/1` to accept scope and filter by scope.business_id
    - Update `get_coach/2` to accept scope and verify access
    - _Requirements: 4.1, 4.2, 4.3, 5.1_

  - [x] 9.2 Update coach mutation functions
    - Update `create_coach/2` to accept scope and use scope.business_id
    - Update `update_coach/3` to accept scope and verify access
    - Update `delete_coach/2` to accept scope and verify access
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 10. Refactor Clients context for scope-based operations

  - [x] 10.1 Update client query functions

    - Update `list_clients/1` to accept scope and filter by scope.business_id
    - Update `get_client/2` to accept scope and verify access
    - _Requirements: 4.1, 4.2, 4.3, 5.2_

  - [x] 10.2 Update client mutation functions

    - Update `create_client/2` to accept scope and use scope.business_id
    - Update `update_client/3` to accept scope and verify access
    - Update `delete_client/2` to accept scope and verify access
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 10.3 Update client invitation functions
    - Update `invite_client/2` to accept scope and use scope.business_id
    - Update `accept_invitation/2` to handle business context
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 11. Refactor Organizations context for scope-based operations

  - [x] 11.1 Update business query functions

    - Update `list_businesses/1` to accept scope and filter by user access
    - Update `get_business/2` to accept scope and verify access
    - _Requirements: 4.1, 4.2, 4.3, 5.3_

  - [x] 11.2 Update business mutation functions
    - Update `create_business/2` to accept scope and set owner from scope.user_id
    - Update `update_business/3` to accept scope and verify ownership
    - Update `delete_business/2` to accept scope and verify ownership
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 12. Add business context switching endpoints

  - [x] 12.1 Implement `switch_context/2` in AuthController

    - Extract scope from conn.assigns.scope
    - Validate requested business_id exists and user has access
    - Call `Accounts.switch_business_context/2` to create new session
    - Return new tokens with updated business context
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x] 12.2 Implement `list_contexts/2` in AuthController

    - Extract scope from conn.assigns.scope
    - Call `Accounts.get_user_business_contexts/1`
    - Return list of available business contexts with details
    - _Requirements: 10.5_

  - [x] 12.3 Add `switch_business_context/2` function to Accounts
    - Verify user has access to requested business_id
    - Determine coach_id and client_id for the business
    - Create new session with specified business context
    - Return session data with new tokens
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 13. Update router with authentication plug

  - [x] 13.1 Create `:api_authenticated` pipeline

    - Add `EasyWeb.Plugs.AuthenticateToken` to pipeline
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 13.2 Apply pipeline to protected routes

    - Update all authenticated routes to use `:api_authenticated` pipeline
    - Keep public routes (register, send-otp, verify-otp) without authentication
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 13.3 Add context switching routes
    - Add POST /api/auth/switch-context route
    - Add GET /api/auth/contexts route
    - _Requirements: 10.1, 10.5_

- [x] 14. Update all controllers to use scope

  - [x] 14.1 Update AuthController

    - Update logout action to use scope
    - Add switch_context and list_contexts actions
    - _Requirements: 9.1, 9.2_

  - [x] 14.2 Update CoachController

    - Extract scope from conn.assigns.scope in all actions
    - Pass scope to all Coaches context functions
    - Handle authorization errors appropriately
    - _Requirements: 9.1, 9.2, 9.3_

  - [x] 14.3 Update ClientController

    - Extract scope from conn.assigns.scope in all actions
    - Pass scope to all Clients context functions
    - Handle authorization errors appropriately
    - _Requirements: 9.1, 9.2, 9.3_

  - [x] 14.4 Update BusinessController
    - Extract scope from conn.assigns.scope in all actions
    - Pass scope to all Organizations context functions
    - Handle authorization errors appropriately
    - _Requirements: 9.1, 9.2, 9.3_

- [x] 15. Add query scoping helpers

  - [x] 15.1 Create `Easy.QueryHelpers` module

    - Implement `scope_to_business/2` to add business_id filter to queries
    - Implement `scope_to_coach/2` to add coach_id filter to queries
    - Implement `scope_to_client/2` to add client_id filter to queries
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 15.2 Apply query helpers in context modules
    - Use query helpers in Coaches context
    - Use query helpers in Clients context
    - Use query helpers in Organizations context
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 16. Update response helpers for business context

  - [x] 16.1 Update session response formatting

    - Include business context in session responses
    - Add context field with business_id, coach_id, client_id, roles
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 16.2 Update verify-otp response
    - Include business context in response
    - Show available contexts if user has multiple
    - _Requirements: 7.1, 7.2, 7.3_

- [x] 17. Update error handling for authorization

  - [x] 17.1 Add authorization error responses

    - Handle `:forbidden` errors from service methods
    - Handle `:business_mismatch` errors
    - Handle `:missing_context` errors
    - Return appropriate HTTP status codes (403 Forbidden)
    - _Requirements: 4.4, 9.3_

  - [x] 17.2 Add authentication error responses
    - Handle missing token errors
    - Handle invalid token errors
    - Handle expired token errors
    - Return appropriate HTTP status codes (401 Unauthorized)
    - _Requirements: 3.4, 3.5_

- [x] 18. Run database migrations

  - Run migration to add business_id to sessions table
  - Verify migration successful
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 19. Verify implementation with manual testing
  - Test login flow with business context
  - Test token refresh with context preservation
  - Test business context switching
  - Test authorization enforcement
  - Test multi-business user scenarios
  - Test tenant isolation
  - _Requirements: All_

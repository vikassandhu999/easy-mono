# Implementation Plan

## Overview

This implementation plan breaks down the API refinement and UUID migration into discrete, manageable coding tasks. Each task builds incrementally on previous tasks, with all code integrated at each step.

## Task List

- [x] 1. Update database migrations to use UUID primary keys
- [x] 1.1 Update users table migration to use UUID

  - Modify `priv/repo/migrations/20251106052345_create_users.exs` to use `uuid` primary key
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 1.2 Update one_time_tokens table migration to use UUID

  - Modify `priv/repo/migrations/20251106052354_create_one_time_tokens.exs` to use `uuid` primary and foreign keys
  - Update `user_id` reference to use `type: :uuid`
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 1.3 Update sessions table migration to use UUID

  - Modify `priv/repo/migrations/20251106052710_create_sessions.exs` to use `uuid` primary and foreign keys
  - Update `user_id` reference to use `type: :uuid`
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 1.4 Update plans table migration to use UUID

  - Modify `priv/repo/migrations/20251106053323_create_plans.exs` to use `uuid` primary key
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 1.5 Update businesses table migration to use UUID

  - Modify `priv/repo/migrations/20251106053324_create_businesses.exs` to use `uuid` primary and foreign keys
  - Update `owner_id` reference to use `type: :uuid`
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 1.6 Update subscriptions table migration to use UUID

  - Modify `priv/repo/migrations/20251106053326_create_subscriptions.exs` to use `uuid` primary and foreign keys
  - Update `business_id` and `plan_id` references to use `type: :uuid`
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 1.7 Update coaches table migration to use UUID

  - Modify `priv/repo/migrations/20251106053328_create_coaches.exs` to use `uuid` primary and foreign keys
  - Update `user_id` and `business_id` references to use `type: :uuid`
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 1.8 Update clients table migration to use UUID

  - Modify `priv/repo/migrations/20251106053329_create_clients.exs` to use `uuid` primary and foreign keys
  - Update `user_id` and `business_id` references to use `type: :uuid`
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 1.9 Update coach_client_assignments table migration to use UUID

  - Modify `priv/repo/migrations/20251106063332_create_coach_client_assignments.exs` to use `uuid` primary and foreign keys
  - Update `coach_id`, `client_id`, and `assigned_by_id` references to use `type: :uuid`
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Update Ecto schemas to use binary_id
- [x] 2.1 Update User schema to use binary_id

  - Add `@primary_key {:id, :binary_id, autogenerate: true}` to User schema
  - Add `@foreign_key_type :binary_id` to User schema
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2.2 Update OneTimeToken schema to use binary_id

  - Add `@primary_key {:id, :binary_id, autogenerate: true}` to OneTimeToken schema
  - Add `@foreign_key_type :binary_id` to OneTimeToken schema
  - Update `token` field to `:binary_id` type
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1_

- [x] 2.3 Update Session schema to use binary_id

  - Add `@primary_key {:id, :binary_id, autogenerate: true}` to Session schema
  - Add `@foreign_key_type :binary_id` to Session schema
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2.4 Update Business schema to use binary_id

  - Add `@primary_key {:id, :binary_id, autogenerate: true}` to Business schema
  - Add `@foreign_key_type :binary_id` to Business schema
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2.5 Update Coach schema to use binary_id

  - Add `@primary_key {:id, :binary_id, autogenerate: true}` to Coach schema
  - Add `@foreign_key_type :binary_id` to Coach schema
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2.6 Update Client schema to use binary_id

  - Add `@primary_key {:id, :binary_id, autogenerate: true}` to Client schema
  - Add `@foreign_key_type :binary_id` to Client schema
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2.7 Update CoachClientAssignment schema to use binary_id

  - Add `@primary_key {:id, :binary_id, autogenerate: true}` to CoachClientAssignment schema
  - Add `@foreign_key_type :binary_id` to CoachClientAssignment schema
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2.8 Update Plan and Subscription schemas to use binary_id

  - Add `@primary_key {:id, :binary_id, autogenerate: true}` to both schemas
  - Add `@foreign_key_type :binary_id` to both schemas
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2.9 Reset database and verify migrations

  - Run `mix ecto.drop && mix ecto.create && mix ecto.migrate`
  - Verify all tables created with UUID primary keys
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 3. Create simplified authentication endpoints
- [x] 3.1 Create new AuthController with send-otp endpoint

  - Implement POST /api/auth/send-otp endpoint
  - Accept `email` and `type` parameters
  - Return `token_id`, `expires_at`, and `status` in response
  - Handle rate limiting with proper error responses
  - _Requirements: 2.1, 2.2, 2.3, 11.1, 11.2, 11.3, 11.7_

- [x] 3.2 Implement verify-otp endpoint in AuthController

  - Implement POST /api/auth/verify-otp endpoint
  - Accept `token_id` and `code` parameters
  - Verify OTP against the token identified by token_id
  - Return user profile with roles and session tokens
  - Include coach_profile or client_profile based on user roles
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 11.4, 12.1, 12.2, 12.3, 12.4, 16.1, 16.2, 16.3_

- [x] 3.3 Implement refresh endpoint in AuthController

  - Implement POST /api/auth/refresh endpoint
  - Accept `refresh_token` parameter
  - Return new `access_token` and `expires_at`
  - _Requirements: 11.5_

- [x] 3.4 Implement logout endpoint in AuthController

  - Implement POST /api/auth/logout endpoint
  - Require Bearer token authentication
  - Revoke the session
  - Return simple success response
  - _Requirements: 11.6_

- [x] 3.5 Update register endpoint to return token_id

  - Modify POST /api/auth/register to return `token_id` instead of `user_id`
  - Return `expires_at` and `status` fields
  - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3_

- [x] 4. Update Accounts context for explicit token handling
- [x] 4.1 Update generate_otp to support token type validation

  - Add validation to ensure token type matches expected flow
  - Return clear error messages for token type mismatches
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [x] 4.2 Update verify_otp to accept token_id parameter

  - Modify verify_otp to look up token by token_id (UUID) instead of email/type
  - Validate token type matches expected flow
  - _Requirements: 2.1, 2.2, 2.3, 12.1, 12.2, 15.1_

- [x] 4.3 Implement idempotent OTP generation

  - Check for existing valid tokens within 60 seconds
  - Return existing token_id if found
  - _Requirements: 18.1, 18.4_

- [x] 4.4 Update create_session to include user roles and profiles

  - Preload coach and client associations
  - Include roles array in response
  - Include coach_profile or client_profile data
  - _Requirements: 16.1, 16.2, 16.3, 16.4_

- [x] 4.5 Add helper function to get recent token for idempotency

  - Create `get_recent_token/3` function
  - Query for tokens created within specified seconds
  - _Requirements: 18.1_

- [x] 5. Streamline coach registration flow
- [x] 5.1 Update onboarding controller to return complete data

  - Modify POST /api/onboarding/business response to include business, coach_profile, and subscription
  - Preload all related entities in a single query
  - Use consistent response format with nested objects
  - _Requirements: 3.5, 3.6, 5.1, 5.2, 5.3, 5.4, 14.1, 14.2, 14.6_

- [x] 5.2 Implement idempotent business creation

  - Check if user already owns a business before creating
  - Return existing business if found
  - Return appropriate HTTP status (200 for existing, 201 for created)
  - _Requirements: 18.2, 18.5_

- [x] 5.3 Verify coach registration flow requires only 3 API calls

  - Test complete flow: register → verify-otp → create-business
  - Verify each response includes all necessary data
  - _Requirements: 3.7_

- [x] 6. Streamline client invitation flow
- [x] 6.1 Update client invitation creation to return token_id

  - Modify POST /api/clients/invite response to include invitation object with token_id
  - Return invitation_url and expires_at
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 6.2 Simplify client invitation acceptance

  - Modify POST /api/invitations/:token_id/accept to accept OTP code directly
  - Combine previous "accept" and "complete" steps into single endpoint
  - Verify OTP, create user, link to client, activate client, assign to coach, and create session
  - Return complete user profile, client profile with assigned coaches, and session tokens
  - _Requirements: 4.7, 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 6.3 Update get_invitation to validate metadata

  - Add validation for client_id in token metadata
  - Add validation for business_id in token metadata
  - Add validation for inviting_coach_id existence
  - Return clear errors for metadata validation failures
  - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_

- [x] 6.4 Implement idempotent client invitation

  - Check for existing pending invitation for same email/business
  - Return existing invitation if found
  - _Requirements: 18.3, 18.5_

- [x] 6.5 Update Clients context for streamlined flow

  - Modify `complete_client_registration` to accept token_id and code
  - Implement all operations in a single transaction
  - Preload assigned coaches in response
  - _Requirements: 4.7, 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 6.6 Verify client invitation flow requires only 3 API calls

  - Test complete flow: invite → view-invitation → accept
  - Verify each response includes all necessary data
  - _Requirements: 4.8_

- [x] 7. Standardize API response formats
- [x] 7.1 Create response formatting helpers

  - Create helper module for consistent response formatting
  - Implement functions for success and error responses
  - Ensure snake_case for all field names
  - Format UUIDs as strings
  - Format timestamps in ISO 8601 with UTC
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6_

- [x] 7.2 Update all controllers to use response helpers

  - Update AuthController responses
  - Update OnboardingController responses
  - Update ClientController responses
  - Update CoachController responses
  - Update BusinessController responses
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 14.1_

- [x] 7.3 Implement comprehensive error codes

  - Define all error codes as constants
  - Update error responses to include error codes
  - Ensure consistent error response format
  - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_

- [x] 7.4 Create error handling module

  - Implement OAuthError-style error module for all errors
  - Define error codes and messages
  - Implement helper functions for common errors
  - _Requirements: 19.1, 19.2, 19.3_

- [x] 8. Update router and deprecate OAuth endpoints
- [x] 8.1 Add new authentication routes

  - Add POST /api/auth/send-otp route
  - Add POST /api/auth/verify-otp route
  - Add POST /api/auth/refresh route
  - Add POST /api/auth/logout route
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

- [x] 8.2 Mark OAuth routes as deprecated

  - Add deprecation comments to OAuth routes
  - Keep OAuth routes functional for backward compatibility
  - _Requirements: 11.7_

- [x] 8.3 Update invitation routes to use token_id

  - Update GET /api/invitations/:token route to use token_id parameter
  - Update POST /api/invitations/:token/accept route to use token_id parameter
  - _Requirements: 4.4, 4.5, 4.6, 4.7_

- [x] 9. Update token cleanup and expiration handling
- [x] 9.1 Implement token expiration checks

  - Ensure expired tokens are rejected in all flows
  - Return TOKEN_EXPIRED error code
  - _Requirements: 9.1, 9.2_

- [x] 9.2 Update cleanup jobs for UUID support

  - Update cleanup_expired_sessions to work with UUIDs
  - Update cleanup_expired_tokens to work with UUIDs
  - Add logging for cleanup operations
  - _Requirements: 9.3, 9.4, 9.5_

- [x] 9.3 Verify rate limiting works with new token system

  - Test rate limiting with token_id responses
  - Verify retry_after is returned correctly
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 10. Update all API responses to use UUIDs
- [x] 10.1 Update user-related responses

  - Ensure all user_id fields return UUIDs as strings
  - Update session responses to include UUID session_id
  - _Requirements: 1.5_

- [x] 10.2 Update business-related responses

  - Ensure business_id, owner_id return UUIDs
  - Update subscription responses with UUID IDs
  - _Requirements: 1.5_

- [x] 10.3 Update coach and client responses

  - Ensure coach_id, client_id return UUIDs
  - Update assignment responses with UUID IDs
  - _Requirements: 1.5_

- [x] 10.4 Update invitation responses

  - Ensure token_id is returned as UUID string
  - Update all related entity IDs to UUIDs
  - _Requirements: 1.5, 2.1_

- [x] 11. Testing and validation
- [x] 11.1 Update existing tests for UUID support

  - Update all test fixtures to use UUIDs
  - Update test assertions to expect UUID strings
  - Fix any broken tests due to UUID migration
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 11.2 Add tests for new authentication endpoints

  - Test POST /api/auth/send-otp endpoint
  - Test POST /api/auth/verify-otp endpoint
  - Test POST /api/auth/refresh endpoint
  - Test POST /api/auth/logout endpoint
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

- [x] 11.3 Add tests for streamlined flows

  - Test complete coach registration flow (3 API calls)
  - Test complete client invitation flow (3 API calls)
  - Verify responses include all necessary data
  - _Requirements: 3.7, 4.8_

- [x] 11.4 Add tests for error handling

  - Test all error codes are returned correctly
  - Test error response format consistency
  - Test rate limiting error responses
  - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_

- [x] 11.5 Add tests for idempotency

  - Test duplicate OTP generation returns same token_id
  - Test duplicate business creation returns existing business
  - Test duplicate invitation returns existing invitation
  - _Requirements: 18.1, 18.2, 18.3_

- [x] 11.6 Add tests for token type validation

  - Test token type mismatch errors
  - Test metadata validation errors
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 17.1, 17.2, 17.3, 17.4_

- [x] 12. Documentation and cleanup
- [x] 12.1 Update API documentation

  - Document new authentication endpoints
  - Document streamlined flows
  - Document error codes
  - Mark OAuth endpoints as deprecated
  - _Requirements: 11.7, 19.2_

- [x] 12.2 Update configuration documentation

  - Document new configuration options
  - Document idempotency settings
  - _Requirements: Configuration section in design_

- [x] 12.3 Create migration guide for API consumers

  - Document changes from integer IDs to UUIDs
  - Document changes from OAuth to simple auth endpoints
  - Provide code examples for migration
  - _Requirements: 11.7_

- [x] 12.4 Run final validation
  - Run `mix precommit` to check for issues
  - Verify all tests pass
  - Verify database migrations work correctly
  - Test complete flows end-to-end
  - _Requirements: All requirements_

## Notes

- All tasks should be completed in order as they build on each other
- After completing database and schema updates (tasks 1-2), reset the database before proceeding
- Test each major component (tasks 3-6) independently before integration
- Run the full test suite after completing task 11
- The OAuth endpoints will remain functional but deprecated for backward compatibility

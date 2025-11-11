# Requirements Document

## Introduction

This feature enables the Coach Application to persist and manage authenticated user profile data received from authentication endpoints (OTP verification and token refresh). Currently, the application receives comprehensive user profile information including coach/client profiles, roles, and business associations, but does not store or expose this data for use throughout the application. This feature will implement a user profile management system that stores, updates, and provides access to user data across the application lifecycle.

## Glossary

- **AuthProvider**: The React context provider component that manages authentication state and token lifecycle
- **User Profile**: The complete user data object returned by authentication endpoints, including user metadata, roles, and associated profile data (coach or client)
- **Coach Profile**: Profile data specific to users with the coach role, including business_id, status, bio, specialties, and credentials
- **Client Profile**: Profile data specific to users with the client role, including business_id, status, phone, and notes
- **Session Data**: Authentication session information including token expiration times
- **RefreshResponse**: The API response from the /api/auth/refresh endpoint containing user and session data
- **VerifyOTPResponse**: The API response from the /api/auth/verify-otp endpoint containing user data
- **User Context**: A React context that provides access to current user profile data throughout the application

## Requirements

### Requirement 1

**User Story:** As a coach user, I want my profile information to be automatically stored when I authenticate, so that the application can display my name, role, and business information throughout the interface

#### Acceptance Criteria

1. WHEN THE AuthProvider receives a VerifyOTPResponse from the verify-otp endpoint, THE AuthProvider SHALL extract the user object and store it in application state
2. WHEN THE AuthProvider receives a RefreshResponse from the refresh endpoint, THE AuthProvider SHALL extract the user object and update the stored user profile
3. WHEN THE AuthProvider successfully stores user profile data, THE AuthProvider SHALL make the user data accessible through the authentication context
4. WHEN THE AuthProvider logout function is called, THE AuthProvider SHALL clear all stored user profile data from application state

### Requirement 2

**User Story:** As a developer, I want a dedicated user context provider, so that any component in the application can access current user profile information without prop drilling

#### Acceptance Criteria

1. THE Application SHALL provide a UserProvider component that manages user profile state
2. THE UserProvider SHALL expose a useUser hook that returns the current user profile data
3. WHEN no user is authenticated, THE useUser hook SHALL return null for the user profile
4. WHEN a user is authenticated, THE useUser hook SHALL return the complete User object including id, email, full_name, email_verified, roles, and associated profile data
5. THE UserProvider SHALL update its state WHEN the AuthProvider provides new user data

### Requirement 3

**User Story:** As a coach user, I want my coach-specific profile information to be accessible, so that the application can display my business association, specialties, and professional credentials

#### Acceptance Criteria

1. WHEN a user has the coach role, THE useUser hook SHALL return the user object with a populated coach_profile property
2. THE coach_profile property SHALL include id, status, business_id, bio, specialties array, and credentials object
3. WHEN a user does not have the coach role, THE coach_profile property SHALL be undefined
4. THE Application SHALL provide type-safe access to coach_profile properties through TypeScript interfaces

### Requirement 4

**User Story:** As a developer, I want the user profile to persist across page refreshes, so that users don't lose their profile data when the application reloads

#### Acceptance Criteria

1. WHEN THE AuthProvider performs an initial authentication check on application load, THE AuthProvider SHALL retrieve user profile data from the refresh endpoint
2. WHEN the refresh endpoint returns user data, THE AuthProvider SHALL populate the user context with the retrieved profile
3. WHEN the refresh endpoint fails, THE AuthProvider SHALL set the user profile to null and mark the user as unauthenticated
4. THE Application SHALL complete the initial authentication check before rendering protected routes

### Requirement 5

**User Story:** As a developer, I want clear TypeScript types for user profile data, so that I can safely access user properties without runtime errors

#### Acceptance Criteria

1. THE Application SHALL define TypeScript interfaces that match the backend API response structure for User, CoachProfile, and ClientProfile
2. THE useUser hook SHALL return typed user data that matches the defined interfaces
3. THE AuthProvider SHALL validate that received user data conforms to expected types before storing
4. WHEN accessing optional profile properties, THE Application SHALL provide type guards or safe access patterns to prevent undefined reference errors

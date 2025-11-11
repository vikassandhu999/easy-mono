# Requirements Document

## Introduction

The business onboarding page is the final step in the coach registration flow. After a user registers and verifies their email, they need to create their business profile to access the coach application. This page collects the business name and optional description, then calls the backend API to create the business, subscription, and coach profile in a single transaction.

## Glossary

- **Frontend Application**: The React-based coach application located in `easy-apps/apps/coachapp`
- **Business Onboarding Page**: The page component at `/onboard` route that collects business information
- **Onboarding API**: The backend endpoint `POST /api/onboarding/business` that creates business and coach profile
- **AuthLayout**: The shared layout component used for authentication and onboarding pages
- **Business**: An organization entity that owns coaches, clients, and subscriptions

## Requirements

### Requirement 1: Business Information Form

**User Story:** As a new coach user, I want to enter my business name and description, so that I can complete my onboarding and access the application.

#### Acceptance Criteria

1. THE Frontend Application SHALL display a form with a required business name text input field
2. THE Frontend Application SHALL display a form with an optional business description textarea field
3. WHEN the user submits the form with an empty business name, THE Frontend Application SHALL display a validation error message "Business name is required"
4. WHEN the user submits the form with a business name shorter than 2 characters, THE Frontend Application SHALL display a validation error message "Business name must be at least 2 characters"
5. THE Frontend Application SHALL use the AuthLayout component for consistent styling with other auth pages

### Requirement 2: API Integration

**User Story:** As a new coach user, I want my business to be created automatically when I submit the form, so that I can start using the application immediately.

#### Acceptance Criteria

1. WHEN the user submits valid business information, THE Frontend Application SHALL call `POST /api/onboarding/business` with the business name and description
2. THE Frontend Application SHALL include the authentication token in the API request
3. WHEN the API request is in progress, THE Frontend Application SHALL disable the submit button and show a loading indicator
4. WHEN the API returns a successful response, THE Frontend Application SHALL display a success notification with message "Business created successfully"
5. WHEN the API returns a successful response, THE Frontend Application SHALL navigate the user to the home page "/"

### Requirement 3: Error Handling

**User Story:** As a new coach user, I want to see clear error messages if something goes wrong, so that I can understand and fix the issue.

#### Acceptance Criteria

1. WHEN the API returns a validation error, THE Frontend Application SHALL display the error message from the API response
2. WHEN the API returns a network error, THE Frontend Application SHALL display a user-friendly error notification
3. WHEN the API returns an error, THE Frontend Application SHALL re-enable the submit button to allow retry
4. THE Frontend Application SHALL use the existing `handleApiError` utility for consistent error handling

### Requirement 4: Idempotency Support

**User Story:** As a new coach user who already created a business, I want to be redirected to the home page if I visit the onboarding page again, so that I don't create duplicate businesses.

#### Acceptance Criteria

1. WHEN the API returns a 200 status (existing business), THE Frontend Application SHALL display a success notification
2. WHEN the API returns a 200 status (existing business), THE Frontend Application SHALL navigate the user to the home page
3. THE Frontend Application SHALL handle both 200 (existing) and 201 (new) status codes as successful responses

### Requirement 5: Form Validation

**User Story:** As a new coach user, I want immediate feedback on form validation, so that I can correct errors before submitting.

#### Acceptance Criteria

1. THE Frontend Application SHALL use Zod schema validation for form fields
2. THE Frontend Application SHALL display validation errors below the respective input fields
3. WHEN the user types in the business name field, THE Frontend Application SHALL clear validation errors for that field
4. THE Frontend Application SHALL prevent form submission when validation errors exist

# Implementation Plan

- [x] 1. Create business service type definitions and API integration
  - Create `src/services/business/business_definition.ts` with Zod schema and TypeScript interfaces
  - Define `CreateBusinessRequest_zod` schema with name (min 2 chars) and optional description
  - Define response interfaces: `Business`, `CoachProfile`, `Plan`, `Subscription`, `CreateBusinessResponse`
  - Create `src/services/business/business.ts` with RTK Query mutation for `POST /api/onboarding/business`
  - Create `src/services/business/index.ts` to export all types and hooks
  - _Requirements: 2.1, 2.2_

- [x] 2. Implement OnboardBusinessPage component
  - Update `src/domains/business/OnboardBusinessPage.tsx` with complete form implementation
  - Use React Hook Form with Zod resolver for form management
  - Add TextInput for business name with IconBriefcase icon
  - Add Textarea for optional business description
  - Add submit button with loading state and IconArrowRight icon
  - Wrap form in AuthLayout with appropriate title and subtitle
  - _Requirements: 1.1, 1.2, 1.5, 2.3_

- [x] 3. Implement form validation and error handling
  - Configure form validation with `CreateBusinessRequest_zod` schema
  - Display validation errors inline below form fields
  - Implement onSubmit handler to call createBusiness mutation
  - Use `handleApiError` utility for API error handling
  - Handle both 200 (existing) and 201 (new) status codes as success
  - _Requirements: 1.3, 1.4, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 5.4_

- [x] 4. Implement success flow and navigation
  - Show success notification with message "Business created successfully" on successful response
  - Navigate to home page "/" after successful business creation
  - _Requirements: 2.4, 2.5_

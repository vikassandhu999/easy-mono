# Implementation Plan

- [x] 1. Create InfoSection component
  - Create `easy-apps/apps/coachapp/src/domains/profile/components/InfoSection.tsx`
  - Implement component with label, value, icon, and placeholder props
  - Use Mantine Stack and Text components for layout
  - Handle empty value states with placeholder text
  - _Requirements: 2.3, 2.4_

- [x] 2. Create ProfileCard component
  - Create `easy-apps/apps/coachapp/src/domains/profile/components/ProfileCard.tsx`
  - Implement ProfileCard component accepting coach and user props
  - Use Mantine Paper component as card container
  - Create header section with Avatar (initials from full_name) and name using Group component
  - Add email verification badge based on user.email_verified
  - Use Divider to separate header from content
  - _Requirements: 1.3, 1.4, 1.5, 2.1, 2.2, 4.1, 4.2, 4.3, 4.4_

- [x] 3. Implement ProfileCard content sections
  - Add InfoSection for email display with icon
  - Add InfoSection for bio with placeholder "No bio added yet" when empty
  - Add InfoSection for specialties displaying as Mantine Badge components or placeholder when empty
  - Add InfoSection for credentials displaying as key-value pairs or placeholder when empty
  - Add InfoSection for status with color-coded Badge (green for active, gray for inactive)
  - Add InfoSection for account creation date formatted using dayjs
  - _Requirements: 1.5, 2.1, 2.2, 2.3, 2.4, 4.1, 4.2, 4.4_

- [x] 4. Complete CoachProfilePage component
  - Import and use useUser hook from UserProvider
  - Import and use useGetCoachQuery with user.coach_profile.id
  - Add skip condition to query when user.coach_profile is undefined
  - Combine loading states from useUser and useGetCoachQuery
  - Render LoadingOverlay when loading is true
  - Render ProfileCard component passing coach data and user data
  - Add "Edit Profile" Button below ProfileCard
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.1_

- [x] 5. Implement navigation to edit page
  - Import useNavigate from react-router
  - Add onClick handler to "Edit Profile" button
  - Navigate to '/profile/edit' when button is clicked
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 6. Add error handling
  - Handle case when user.coach_profile is undefined (display message)
  - Handle useGetCoachQuery error state (display error message with retry)
  - Handle network errors gracefully
  - Add console.error logging for debugging
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ]* 7. Add responsive design improvements
  - Add max-width constraint to ProfileCard (800px)
  - Center card on larger screens
  - Ensure proper spacing on mobile devices
  - Test avatar size on different screen sizes
  - _Requirements: 1.3, 1.4, 1.5_

- [ ]* 8. Enhance accessibility
  - Add proper ARIA labels to icons
  - Ensure proper heading hierarchy
  - Verify keyboard navigation works correctly
  - Test color contrast for status badges
  - _Requirements: 1.3, 1.4, 1.5, 4.1_

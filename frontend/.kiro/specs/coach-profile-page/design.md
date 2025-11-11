# Design Document

## Overview

The Coach Profile Page is a read-only view that displays comprehensive coach profile information. It consists of a main page component (`CoachProfilePage`) and a reusable profile card component (`ProfileCard`) that renders the coach's details in a structured, visually appealing format using Mantine UI components.

The page integrates with the existing authentication system via `UserProvider` and fetches detailed coach data using RTK Query's `useGetCoachQuery` hook. The design follows the existing patterns in the coachapp, using Mantine's component library for consistent UI/UX.

## Architecture

### Component Hierarchy

```
CoachProfilePage
├── LoadingOverlay (conditional)
├── PaddingContainer
    └── Stack
        ├── ProfileCard
        │   ├── Paper (card container)
        │   │   └── Stack
        │   │       ├── Group (header with avatar and name)
        │   │       ├── Divider
        │   │       ├── InfoSection (email)
        │   │       ├── InfoSection (bio)
        │   │       ├── InfoSection (specialties)
        │   │       ├── InfoSection (credentials)
        │   │       ├── InfoSection (status)
        │   │       └── InfoSection (account created)
        └── Button (Edit Profile)
```

### Data Flow

1. **Authentication Check**: `UserProvider` provides the current authenticated user
2. **Profile Fetch**: Use `user.coach_profile.id` to fetch detailed coach data via `useGetCoachQuery`
3. **Loading State**: Display `LoadingOverlay` while either user or coach data is loading
4. **Error Handling**: Handle missing coach profile or API errors gracefully
5. **Render**: Pass coach data to `ProfileCard` for display

## Components and Interfaces

### CoachProfilePage Component

**Purpose**: Main page component that orchestrates data fetching and layout

**Props**: None (uses context and routing)

**State Management**:
- Uses `useUser()` hook for authenticated user data
- Uses `useGetCoachQuery()` for detailed coach profile
- Manages combined loading state

**Key Behaviors**:
- Skip query if user doesn't have a coach profile
- Show loading overlay during data fetch
- Navigate to edit page on button click
- Handle error states appropriately

### ProfileCard Component

**Purpose**: Reusable component that displays coach profile information in a card format

**Props**:
```typescript
interface ProfileCardProps {
  coach: Coach;
  user: User;
}
```

**Layout Structure**:
- Uses Mantine `Paper` component for card container
- Uses `Stack` for vertical layout with consistent spacing
- Uses `Group` for horizontal layouts (e.g., avatar + name)
- Uses `Divider` to separate sections

**Sections**:
1. **Header**: Avatar (initials) + Full Name + Email verification badge
2. **Email**: Display email with icon
3. **Bio**: Display bio or placeholder if empty
4. **Specialties**: Display as badges/chips or placeholder
5. **Credentials**: Display as key-value pairs or placeholder
6. **Status**: Display account status with color indicator
7. **Account Info**: Display creation date

### InfoSection Sub-component

**Purpose**: Reusable component for displaying labeled information

**Props**:
```typescript
interface InfoSectionProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  placeholder?: string;
}
```

## Data Models

### Coach (from API)
```typescript
interface Coach {
  id: string;
  user_id: string;
  business_id: string;
  bio: string | null;
  specialties: string[];
  credentials: Record<string, any>;
  status: string;
  created_at: string;
  updated_at: string;
  user?: User;
}
```

### User (from UserProvider)
```typescript
interface User {
  id: string;
  email: string;
  full_name: string;
  email_verified: boolean;
  roles: string[];
  coach_profile?: CoachProfile;
  client_profile?: ClientProfile;
}
```

### CoachProfile (nested in User)
```typescript
interface CoachProfile {
  id: string;
  business_id: string;
  bio: string | null;
  specialties: string[];
  credentials: Record<string, unknown>;
  status: string;
}
```

## Error Handling

### Error Scenarios

1. **User Not Authenticated**
   - Detection: `!user` after loading completes
   - Handling: Redirect to login (handled by PrivateRoute)

2. **No Coach Profile**
   - Detection: `!user.coach_profile`
   - Handling: Display message "No coach profile found" with link to support

3. **API Error**
   - Detection: `useGetCoachQuery` returns error
   - Handling: Display error message with retry button

4. **Network Error**
   - Detection: Query fails with network error
   - Handling: Display "Unable to load profile. Please check your connection."

### Error Display Pattern

```typescript
if (error) {
  return (
    <PaddingContainer>
      <Stack align="center" gap="md">
        <Text c="red">Error loading profile</Text>
        <Button onClick={refetch}>Retry</Button>
      </Stack>
    </PaddingContainer>
  );
}
```

## Testing Strategy

### Unit Tests (Optional)

1. **ProfileCard Component**
   - Renders all coach information correctly
   - Shows placeholders for empty fields
   - Displays specialties as badges
   - Formats credentials properly

2. **InfoSection Component**
   - Renders label and value
   - Shows placeholder when value is empty
   - Displays icon when provided

### Integration Tests (Optional)

1. **CoachProfilePage**
   - Fetches coach data on mount
   - Shows loading state during fetch
   - Renders ProfileCard with correct data
   - Handles navigation to edit page
   - Displays error states appropriately

### Manual Testing Checklist

1. Load page with valid coach profile
2. Verify all fields display correctly
3. Test with empty bio, specialties, credentials
4. Test email verification badge states
5. Click "Edit Profile" button and verify navigation
6. Test loading states
7. Test error states (network disconnected)
8. Test with different screen sizes (responsive)

## UI/UX Considerations

### Visual Design

- **Card Style**: Use Mantine `Paper` with shadow and padding
- **Spacing**: Consistent spacing using Mantine's spacing scale (xs, sm, md, lg)
- **Typography**: Use Mantine's Text and Title components with appropriate sizes
- **Colors**: Use theme colors for status indicators and badges
- **Icons**: Use Tabler icons for visual indicators

### Responsive Design

- Card should be full-width on mobile
- Max-width constraint on larger screens (e.g., 800px)
- Stack layout naturally responsive
- Avatar size adjusts for mobile

### Accessibility

- Proper heading hierarchy (h1 for page title)
- Semantic HTML elements
- ARIA labels for icons
- Keyboard navigation support
- Color contrast compliance

### Empty States

- **No Bio**: "No bio added yet"
- **No Specialties**: "No specialties added yet"
- **No Credentials**: "No credentials added yet"

### Status Indicators

- **Active**: Green badge
- **Inactive**: Gray badge
- **Pending**: Yellow badge

## Implementation Notes

### Mantine Components to Use

- `Paper`: Card container
- `Stack`: Vertical layouts
- `Group`: Horizontal layouts
- `Avatar`: User avatar with initials
- `Badge`: Status and verification indicators
- `Text`: All text content
- `Title`: Section headings
- `Button`: Edit profile action
- `Divider`: Section separators
- `LoadingOverlay`: Loading state
- `ActionIcon`: Icon buttons

### Styling Approach

- Use Mantine's built-in props for styling (no custom CSS)
- Use theme spacing and colors
- Leverage Mantine's responsive props where needed

### Navigation

- Use `react-router`'s `useNavigate` hook
- Navigate to `/profile/edit` on edit button click
- Maintain authentication state during navigation

### Performance Considerations

- Memoize ProfileCard component to prevent unnecessary re-renders
- Use RTK Query's caching for coach data
- Skip query when user data not available
- Lazy load edit page component

## Future Enhancements

1. **Profile Picture Upload**: Replace avatar initials with actual photo
2. **Social Links**: Add social media profile links
3. **Certifications Display**: Enhanced credentials display with images
4. **Activity Timeline**: Show recent coaching activities
5. **Statistics**: Display coaching metrics (clients, sessions, etc.)
6. **Share Profile**: Generate shareable profile link

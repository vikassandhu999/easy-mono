# Design Document

## Overview

The business onboarding page is a form-based component that collects business information from newly registered coaches. It follows the same design patterns as the existing auth pages (RegisterPage, LoginPage) using Mantine UI components, React Hook Form for form management, and Zod for validation. The page integrates with the backend `/api/onboarding/business` endpoint to create the business, subscription, and coach profile in a single transaction.

## Architecture

### Component Structure

```
OnboardBusinessPage (Page Component)
├── AuthLayout (Shared Layout)
│   ├── Title: "Create Your Business"
│   ├── Subtitle: "Set up your coaching business to get started"
│   └── Form Content
└── Form
    ├── Business Name Input (TextInput)
    ├── Business Description Input (Textarea)
    └── Submit Button
```

### Data Flow

1. User fills out the form
2. Form validation occurs on blur and submit
3. On submit, API mutation is triggered
4. Loading state is shown during API call
5. On success: Show notification → Navigate to home
6. On error: Show error notification → Re-enable form

## Components and Interfaces

### 1. Type Definitions

Create new types in `src/services/business/business_definition.ts`:

```typescript
import {z} from 'zod';

// Request schema
export const CreateBusinessRequest_zod = z.object({
    name: z.string().min(2, 'Business name must be at least 2 characters').max(100, 'Business name is too long'),
    description: z.string().optional(),
});

export type CreateBusinessRequest = z.infer<typeof CreateBusinessRequest_zod>;

// Response types
export interface Business {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    owner_id: string;
    status: string;
}

export interface CoachProfile {
    id: string;
    user_id: string;
    business_id: string;
    status: string;
    bio: string | null;
    specialties: string[];
    credentials: Record<string, unknown>;
}

export interface Plan {
    id: string;
    name: string;
    slug: string;
    price_cents: number;
    billing_interval: string;
}

export interface Subscription {
    id: string;
    business_id: string;
    plan_id: string;
    status: string;
    plan: Plan;
}

export interface CreateBusinessResponse {
    business: Business;
    coach_profile: CoachProfile;
    subscription: Subscription;
}
```

### 2. API Service

Create new API service in `src/services/business/business.ts`:

```typescript
import {baseAPISlice} from '../baseAPISlice';
import {CreateBusinessRequest, CreateBusinessResponse} from './business_definition';

export const businessApi = baseAPISlice.injectEndpoints({
    endpoints: (build) => ({
        createBusiness: build.mutation<CreateBusinessResponse, CreateBusinessRequest>({
            query: (body) => ({
                url: '/api/onboarding/business',
                method: 'post',
                data: body,
            }),
        }),
    }),
    overrideExisting: false,
});

export const {useCreateBusinessMutation} = businessApi;
```

Create index file `src/services/business/index.ts`:

```typescript
export * from './business';
export * from './business_definition';
```

### 3. OnboardBusinessPage Component

```typescript
import {zodResolver} from '@hookform/resolvers/zod';
import {Button, Stack, Text, TextInput, Textarea} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import {IconArrowRight, IconBriefcase} from '@tabler/icons-react';
import React from 'react';
import {useForm} from 'react-hook-form';
import {useNavigate} from 'react-router';

import AuthLayout from '@/domains/auth/layouts/AuthLayout';
import {
    CreateBusinessRequest,
    CreateBusinessRequest_zod,
    useCreateBusinessMutation,
} from '@/services/business';
import {handleApiError} from '@/utils/error';

const OnboardBusinessPage: React.FC = () => {
    const navigate = useNavigate();
    const [createBusiness, {isLoading}] = useCreateBusinessMutation();

    const form = useForm<CreateBusinessRequest>({
        defaultValues: {
            name: '',
            description: '',
        },
        resolver: zodResolver(CreateBusinessRequest_zod),
        mode: 'onBlur',
    });

    const onSubmit = async (values: CreateBusinessRequest) => {
        try {
            await createBusiness(values).unwrap();

            notifications.show({
                title: 'Success',
                message: 'Business created successfully',
                color: 'green',
            });

            navigate('/');
        } catch (err) {
            handleApiError(err);
        }
    };

    return (
        <AuthLayout
            subtitle="Set up your coaching business to get started"
            title="Create Your Business"
        >
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <Stack gap="md">
                    <TextInput
                        label={
                            <Text fw={500} size="md">
                                Business Name
                            </Text>
                        }
                        placeholder="Awesome Coaching"
                        size="lg"
                        leftSection={<IconBriefcase size={16} />}
                        {...form.register('name')}
                        error={form.formState.errors.name?.message}
                        required
                    />

                    <Textarea
                        label={
                            <Text fw={500} size="md">
                                Description (Optional)
                            </Text>
                        }
                        placeholder="Tell us about your coaching business..."
                        size="lg"
                        minRows={3}
                        {...form.register('description')}
                        error={form.formState.errors.description?.message}
                    />

                    <Button
                        fullWidth
                        loading={isLoading}
                        rightSection={<IconArrowRight size={16} />}
                        size="lg"
                        type="submit"
                    >
                        Create Business
                    </Button>
                </Stack>
            </form>
        </AuthLayout>
    );
};

export default OnboardBusinessPage;
```

## Data Models

### Form Data Flow

```
User Input → React Hook Form → Zod Validation → API Request
                                                      ↓
                                                   Success
                                                      ↓
                                            Notification + Navigate
```

### API Request

```json
POST /api/onboarding/business
{
  "name": "Awesome Coaching",
  "description": "Professional coaching services"
}
```

### API Response (201 Created or 200 OK)

```json
{
  "business": {
    "id": "456",
    "name": "Awesome Coaching",
    "slug": "awesome-coaching",
    "description": "Professional coaching services",
    "owner_id": "123",
    "status": "active"
  },
  "coach_profile": {
    "id": "789",
    "user_id": "123",
    "business_id": "456",
    "status": "active",
    "bio": null,
    "specialties": [],
    "credentials": {}
  },
  "subscription": {
    "id": "101",
    "business_id": "456",
    "plan_id": "1",
    "status": "active",
    "plan": {
      "id": "1",
      "name": "Free",
      "slug": "free",
      "price_cents": 0,
      "billing_interval": "month"
    }
  }
}
```

## Error Handling

### Validation Errors

- Client-side validation using Zod schema
- Display errors inline below form fields
- Prevent submission when validation fails

### API Errors

1. **Validation Error (422)**:
   - Extract error details from API response
   - Display using `handleApiError` utility
   - Example: "Business name can't be blank"

2. **Unauthorized (401)**:
   - Should not occur if user is authenticated
   - Handled by base API slice (redirects to login)

3. **Network Errors**:
   - Display generic error notification
   - Allow user to retry

4. **Idempotent Response (200)**:
   - Treat as success
   - Show success notification
   - Navigate to home page

## Testing Strategy

### Manual Testing

1. **Happy Path**:
   - Fill in business name
   - Optionally add description
   - Submit form
   - Verify success notification
   - Verify navigation to home page

2. **Validation**:
   - Submit empty form → See "Business name is required" error
   - Enter 1 character → See "Business name must be at least 2 characters" error
   - Enter valid name → Error clears

3. **API Errors**:
   - Test with invalid token → Should redirect to login
   - Test with duplicate business → Should succeed (idempotent)

4. **Loading State**:
   - Submit form
   - Verify button shows loading spinner
   - Verify button is disabled during submission

### Integration Testing (Optional)

- Test form submission with mocked API
- Test error handling with mocked API errors
- Test navigation after successful submission

## Implementation Notes

### Reusing Existing Patterns

- Follow the same structure as `RegisterPage.tsx`
- Use `AuthLayout` for consistent styling
- Use `handleApiError` for error handling
- Use Mantine UI components (TextInput, Textarea, Button)
- Use React Hook Form with Zod resolver

### File Organization

```
src/
├── domains/
│   └── business/
│       └── OnboardBusinessPage.tsx
└── services/
    └── business/
        ├── index.ts
        ├── business.ts
        └── business_definition.ts
```

### Routing

The route should already be configured in the app router. If not, add:

```typescript
<Route path="/onboard" element={<OnboardBusinessPage />} />
```

### Authentication

The page requires authentication. Ensure the route is protected by the auth guard or that the user is redirected to login if not authenticated.

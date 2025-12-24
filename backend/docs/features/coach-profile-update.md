# Coach Profile Update - End-to-End Documentation

## Overview

This document describes the complete flow for viewing and updating a Coach's profile information, including personal details, bio, specialties, certifications, years of experience, and social media links.

---

## Table of Contents

1. [Feature Summary](#feature-summary)
2. [Data Model](#data-model)
3. [API Endpoints](#api-endpoints)
4. [Frontend Components](#frontend-components)
5. [User Flow](#user-flow)
6. [Validation Rules](#validation-rules)
7. [File References](#file-references)

---

## Feature Summary

**As a Coach**, I want to update my public-facing information (Bio, Specialties, Social Links, Years of Experience, and Certifications) so that potential clients have the most up-to-date information about my services.

### Supported Fields

| Field | Description |
|-------|-------------|
| Bio | Coach's personal description and coaching style |
| Specialties | Areas of expertise (e.g., Weight Loss, Muscle Building) |
| Certifications | Professional certifications (e.g., NASM-CPT, ACE) |
| Years of Experience | Total years in the coaching field |
| Instagram URL | Link to Instagram profile |
| Facebook URL | Link to Facebook page |
| YouTube URL | Link to YouTube channel |
| X (Twitter) URL | Link to X/Twitter profile |

---

## Data Model

### Database Schema

**Table**: `coaches`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | auto | Primary key |
| user_id | uuid | No | - | Foreign key to users table |
| business_id | uuid | No | - | Foreign key to businesses table |
| bio | string | Yes | null | Coach biography |
| specialties | string[] | Yes | [] | Array of specialty strings |
| credentials | map | Yes | null | Additional credentials (legacy) |
| status | string | No | "active" | Coach status |
| instagram_url | string | Yes | null | Instagram profile URL |
| facebook_url | string | Yes | null | Facebook page URL |
| youtube_url | string | Yes | null | YouTube channel URL |
| x_url | string | Yes | null | X/Twitter profile URL |
| years_of_experience | integer | Yes | null | Years of coaching experience |
| certifications | string[] | Yes | [] | Array of certification strings |
| inserted_at | datetime | No | auto | Record creation timestamp |
| updated_at | datetime | No | auto | Record update timestamp |

### Ecto Schema

```elixir
# lib/easy/organizations/coach.ex

schema "coaches" do
  field :bio, :string
  field :specialties, {:array, :string}
  field :credentials, :map
  field :status, :string, default: "active"

  # Social links
  field :instagram_url, :string
  field :facebook_url, :string
  field :youtube_url, :string
  field :x_url, :string

  # Additional profile fields
  field :years_of_experience, :integer
  field :certifications, {:array, :string}

  belongs_to :user, Easy.Accounts.User
  belongs_to :business, Easy.Organizations.Business

  timestamps()
end
```

---

## API Endpoints

### 1. Get Coach Profile

Retrieves the authenticated coach's profile information.

**Endpoint**: `GET /api/auth/me`

**Authentication**: Required (Bearer token)

**Response**:

```json
{
  "user": {
    "id": "uuid",
    "email": "coach@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "email_verified": true
  },
  "coach": {
    "id": "uuid",
    "business_id": "uuid",
    "bio": "Certified fitness coach with 5+ years of experience...",
    "specialties": ["Weight Loss", "Strength Training"],
    "instagram_url": "https://instagram.com/coach_john",
    "facebook_url": "https://facebook.com/coachjohn",
    "youtube_url": "https://youtube.com/@coachjohn",
    "x_url": "https://x.com/coach_john",
    "years_of_experience": 5,
    "certifications": ["NASM-CPT", "ACE Certified"],
    "stats": {
      "total_clients": 25,
      "total_plans": 42
    }
  }
}
```

### 2. Update Coach Profile

Updates the authenticated coach's profile information. Supports partial updates.

**Endpoint**: `PATCH /api/coach/profile`

**Authentication**: Required (Bearer token with coach role)

**Request Body** (all fields optional):

```json
{
  "first_name": "John",
  "last_name": "Doe",
  "bio": "Updated bio text...",
  "specialties": ["Weight Loss", "Nutrition"],
  "instagram_url": "https://instagram.com/coach_john",
  "facebook_url": "https://facebook.com/coachjohn",
  "youtube_url": "https://youtube.com/@coachjohn",
  "x_url": "https://x.com/coach_john",
  "years_of_experience": 6,
  "certifications": ["NASM-CPT", "ACE Certified", "Precision Nutrition"]
}
```

**Success Response** (200):

```json
{
  "status": "ok",
  "message": "Profile updated successfully",
  "user": {
    "id": "uuid",
    "email": "coach@example.com",
    "first_name": "John",
    "last_name": "Doe"
  }
}
```

**Error Response** (422 - Validation Error):

```json
{
  "errors": {
    "bio": ["cannot exceed 200 words (currently 250 words)"],
    "specialties": ["cannot have more than 6 items"],
    "instagram_url": ["must be a valid URL (e.g., https://example.com)"]
  }
}
```

---

## Frontend Components

### Component Architecture

```
SettingsPage
    └── Click "My Profile"
            └── CoachProfileViewDrawer (Read-only)
                    └── Click "Edit Profile"
                            └── CoachProfileEditDrawer (Form)
```

### 1. CoachProfileViewDrawer

**Location**: `apps/coachapp/src/shared/drawers/CoachProfileViewDrawer.tsx`

**Purpose**: Displays coach profile in read-only mode.

**Sections**:
- Personal Information (Name, Email)
- Coach Profile (Bio, Years of Experience)
- Specialties (Badge list)
- Certifications (List with icons)
- Social Links (Clickable links with platform icons)

**Actions**:
- "Edit Profile" button → Opens `CoachProfileEditDrawer`

### 2. CoachProfileEditDrawer

**Location**: `apps/coachapp/src/shared/drawers/CoachProfileEditDrawer.tsx`

**Purpose**: Form for editing coach profile fields.

**Form Fields**:

| Field | Component | Features |
|-------|-----------|----------|
| First Name | TextInput | Required |
| Last Name | TextInput | Required |
| Bio | Textarea | Word counter (max 200) |
| Years of Experience | NumberInput | Min 0 |
| Specialties | Tag Input | Add/remove tags, max 6 |
| Certifications | Tag Input | Add/remove tags |
| Instagram URL | TextInput | URL validation, icon |
| Facebook URL | TextInput | URL validation, icon |
| YouTube URL | TextInput | URL validation, icon |
| X URL | TextInput | URL validation, icon |

**Actions**:
- "Save Changes" button → Submits form, invalidates cache, closes drawer

### 3. Drawer Configuration

**Location**: `apps/coachapp/src/configs/drawer.ts`

```typescript
// Drawer keys
COACH_PROFILE_VIEW: 'coach_profile_view',
COACH_PROFILE_EDIT: 'coach_profile_edit',

// Drawer config
{
    id: 'coach-profile-view',
    key: 'coach_profile_view',
    type: 'view',
    prev_key: null,
    values: [],
},
{
    id: 'coach-profile-edit',
    key: 'coach_profile_edit',
    type: 'edit',
    prev_key: 'coach_profile_view',  // Back button returns to view
    values: [],
},
```

### 4. RTK Query Integration

**Location**: `apps/coachapp/src/services/auth/auth.ts`

```typescript
// Query - fetches profile
profile: build.query<UserProfileResponse, void>({
    query: () => ({ url: '/api/auth/me', method: 'get' }),
    providesTags: ['Profile'],
}),

// Mutation - updates profile
updateCoachProfile: build.mutation<UpdateCoachProfileResponse, UpdateCoachProfileRequest>({
    query: (body) => ({ url: '/api/coach/profile', method: 'patch', data: body }),
    invalidatesTags: ['Coach', 'Profile'],  // Invalidates cache after update
}),
```

---

## User Flow

### Viewing Profile

```
┌─────────────────────────────────────────────────────────────┐
│                      Settings Page                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  👤 My Profile                              [>]     │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🏢 Business Profile                        [>]     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Click "My Profile"
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  CoachProfileViewDrawer                     │
│                                                             │
│  PERSONAL INFORMATION                                       │
│  Name                                      John Doe         │
│  Email                              coach@example.com       │
│  ─────────────────────────────────────────────────────────  │
│  COACH PROFILE                                              │
│  Bio                                                        │
│  Certified fitness coach with 5+ years of experience...    │
│  💼 5 years of experience                                   │
│  ─────────────────────────────────────────────────────────  │
│  SPECIALTIES                                                │
│  [Weight Loss] [Strength Training] [Nutrition]              │
│  ─────────────────────────────────────────────────────────  │
│  CERTIFICATIONS                                             │
│  🏆 NASM-CPT                                                │
│  🏆 ACE Certified                                           │
│  ─────────────────────────────────────────────────────────  │
│  SOCIAL LINKS                                               │
│  📷 Instagram         instagram.com/coach_john    [↗]      │
│  📘 Facebook          facebook.com/coachjohn      [↗]      │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              ✏️  Edit Profile                        │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Editing Profile

```
┌─────────────────────────────────────────────────────────────┐
│              CoachProfileEditDrawer                         │
│                                                             │
│  PERSONAL INFORMATION                                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ First Name *                                        │   │
│  │ [John                                          ]    │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Last Name *                                         │   │
│  │ [Doe                                           ]    │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Email (disabled)                                    │   │
│  │ [coach@example.com                             ]    │   │
│  └─────────────────────────────────────────────────────┘   │
│  ─────────────────────────────────────────────────────────  │
│  COACH PROFILE                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Bio                                                 │   │
│  │ [Certified fitness coach with 5+ years...      ]   │   │
│  │                                                     │   │
│  │                                    45 / 200 words   │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Years of Experience                                 │   │
│  │ [5                                             ]    │   │
│  └─────────────────────────────────────────────────────┘   │
│  ─────────────────────────────────────────────────────────  │
│  SPECIALTIES (3/6)                                          │
│  [Weight Loss ✕] [Strength Training ✕] [Nutrition ✕]       │
│  ┌──────────────────────────────────────────┐ ┌───┐        │
│  │ Add specialty...                         │ │ + │        │
│  └──────────────────────────────────────────┘ └───┘        │
│  ─────────────────────────────────────────────────────────  │
│  CERTIFICATIONS                                             │
│  [NASM-CPT ✕] [ACE Certified ✕]                            │
│  ┌──────────────────────────────────────────┐ ┌───┐        │
│  │ Add certification...                     │ │ + │        │
│  └──────────────────────────────────────────┘ └───┘        │
│  ─────────────────────────────────────────────────────────  │
│  SOCIAL LINKS                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📷 [https://instagram.com/coach_john          ]    │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📘 [https://facebook.com/coachjohn            ]    │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📺 [https://youtube.com/@coachjohn            ]    │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 𝕏  [https://x.com/coach_john                  ]    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              💾  Save Changes                        │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow Sequence

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │     │  Redux   │     │  API     │     │ Backend  │
│   (UI)   │     │  Store   │     │  Layer   │     │  Server  │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │ Open Profile   │                │                │
     │ View Drawer    │                │                │
     │───────────────>│                │                │
     │                │ useProfileQuery│                │
     │                │───────────────>│                │
     │                │                │ GET /api/auth/me
     │                │                │───────────────>│
     │                │                │                │
     │                │                │<───────────────│
     │                │<───────────────│  Profile Data  │
     │<───────────────│                │                │
     │  Render View   │                │                │
     │                │                │                │
     │ Click "Edit"   │                │                │
     │───────────────>│                │                │
     │  Open Edit     │                │                │
     │  Drawer        │                │                │
     │                │                │                │
     │ Submit Form    │                │                │
     │───────────────>│                │                │
     │                │updateCoachProfile              │
     │                │───────────────>│                │
     │                │                │PATCH /api/coach/profile
     │                │                │───────────────>│
     │                │                │                │
     │                │                │<───────────────│
     │                │                │  Success       │
     │                │ Invalidate     │                │
     │                │ ['Profile']    │                │
     │                │<───────────────│                │
     │                │ Refetch Profile│                │
     │                │───────────────>│                │
     │                │                │ GET /api/auth/me
     │                │                │───────────────>│
     │                │                │<───────────────│
     │<───────────────│  Updated Data  │                │
     │ Close Drawer   │                │                │
     │ Show Success   │                │                │
     │                │                │                │
```

---

## Validation Rules

### Backend Validations (Ecto Changeset)

| Field | Rule | Error Message |
|-------|------|---------------|
| bio | Max 200 words | "cannot exceed 200 words (currently X words)" |
| specialties | Max 6 items | "cannot have more than 6 items" |
| instagram_url | Valid URL format (http/https) | "must be a valid URL (e.g., https://example.com)" |
| facebook_url | Valid URL format (http/https) | "must be a valid URL (e.g., https://example.com)" |
| youtube_url | Valid URL format (http/https) | "must be a valid URL (e.g., https://example.com)" |
| x_url | Valid URL format (http/https) | "must be a valid URL (e.g., https://example.com)" |
| years_of_experience | >= 0 | "must be 0 or greater" |

### Frontend Validations (Zod Schema)

```typescript
export const UpdateCoachProfile_zod = z.object({
    first_name: z.string().min(1, 'First name is required').max(127),
    last_name: z.string().min(1, 'Last name is required').max(127),
    bio: z.string().optional().nullable()
        .refine((val) => !val || countWords(val) <= 200, {
            message: 'Bio cannot exceed 200 words',
        }),
    specialties: z.array(z.string()).max(6, 'Maximum 6 specialties allowed').optional(),
    instagram_url: z.string().url('Please enter a valid URL').optional().nullable().or(z.literal('')),
    facebook_url: z.string().url('Please enter a valid URL').optional().nullable().or(z.literal('')),
    youtube_url: z.string().url('Please enter a valid URL').optional().nullable().or(z.literal('')),
    x_url: z.string().url('Please enter a valid URL').optional().nullable().or(z.literal('')),
    years_of_experience: z.number().int().min(0, 'Years of experience must be 0 or greater').optional().nullable(),
    certifications: z.array(z.string()).optional(),
});
```

---

## File References

### Backend

| File | Purpose |
|------|---------|
| `lib/easy/organizations/coach.ex` | Ecto schema and changesets with validations |
| `lib/easy_web/controllers/auth_controller.ex` | API endpoints (me, update_coach_profile) |
| `lib/easy_web/router.ex` | Route definitions |
| `priv/repo/migrations/20251223153600_add_coach_profile_fields.exs` | Database migration |

### Frontend

| File | Purpose |
|------|---------|
| `src/shared/drawers/CoachProfileViewDrawer.tsx` | Read-only profile view |
| `src/shared/drawers/CoachProfileEditDrawer.tsx` | Profile edit form |
| `src/services/auth/auth_definition.ts` | TypeScript types and Zod schemas |
| `src/services/auth/auth.ts` | RTK Query endpoints |
| `src/configs/drawer.ts` | Drawer configuration |
| `src/domains/drawer/pages/InAppDrawerPage.tsx` | Drawer routing |
| `src/domains/profile/pages/SettingsPage.tsx` | Settings page with profile link |

---

## Testing Checklist

### Manual Testing

- [ ] Open profile view from Settings page
- [ ] Verify all fields display correctly (including empty states)
- [ ] Click "Edit Profile" button opens edit drawer
- [ ] Verify back button returns to view drawer
- [ ] Test word counter updates in real-time for bio
- [ ] Test adding/removing specialties (max 6)
- [ ] Test adding/removing certifications
- [ ] Test social URL validation (invalid URLs show error)
- [ ] Test years of experience (negative numbers rejected)
- [ ] Submit form and verify success notification
- [ ] Verify profile view updates after save

### Edge Cases

- [ ] Empty bio saves as null
- [ ] Empty social URLs save as null
- [ ] Bio at exactly 200 words is valid
- [ ] Bio at 201 words shows error
- [ ] Specialties at exactly 6 items hides add input
- [ ] Duplicate specialties/certifications are prevented

---

## Future Enhancements

1. **Avatar Upload**: Add profile picture upload to Digital Ocean storage
2. **Public Profile Preview**: Preview how profile appears to clients
3. **Profile Completeness**: Show progress indicator for profile completion
4. **Social Link Verification**: Validate that social URLs point to correct platforms
5. **Rich Text Bio**: Support markdown or basic formatting in bio
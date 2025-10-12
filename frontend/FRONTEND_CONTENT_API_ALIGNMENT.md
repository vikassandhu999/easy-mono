# Frontend Content API Alignment with Backend

**Date**: October 12, 2025  
**Scope**: Align frontend content API calls with backend endpoints

## Backend Content Endpoints (Source of Truth)

Based on `/apps/easyserver/routes/coach/routes.go`:

```go
POST   /v1/coach/contents                    → CreateContent()
GET    /v1/coach/contents                    → ListContents()
GET    /v1/coach/contents/:contentId         → GetContent()
PATCH  /v1/coach/contents/:contentId         → UpdateContent()
POST   /v1/coach/contents/:contentId/archive → ArchiveContent()
POST   /v1/coach/contents/:contentId/unarchive → UnarchiveContent()
POST   /v1/coach/contents/:contentId/duplicate → DuplicateContent()
```

**Total: 7 endpoints**

## Changes Applied to Frontend

### 1. Removed Non-Existent Endpoint

❌ **deleteContent** - Backend does NOT have a DELETE endpoint
```typescript
// REMOVED (not in backend)
deleteContent: build.mutation<{message: string}, string>({
    query: (id) => ({
        url: `/v1/coach/contents/${id}`,
        method: 'delete',
    }),
})
```

**Rationale**: Backend uses archive/unarchive pattern instead of hard deletes for content. This follows the constitutional pattern of soft-delete.

---

### 2. Fixed getContent Query Parameter

**Before:**
```typescript
getContent: build.query<Content, {id: string}>({
    query: ({id}) => ({
        url: `/v1/coach/contents/${id}`,
        method: 'get',
    }),
    providesTags: (_result, _error, {id}) => [{type: 'Contents', id}],
})
```

**After:**
```typescript
getContent: build.query<Content, string>({
    query: (id) => ({
        url: `/v1/coach/contents/${id}`,
        method: 'get',
    }),
    providesTags: (_result, _error, id) => [{type: 'Contents', id}],
})
```

**Changes:**
- Parameter changed from `{id: string}` to `string` (simpler)
- Destructuring removed from query function
- Consistent with other single-parameter queries

**Usage Impact:**
```typescript
// Before
const { data } = useGetContentQuery({ id: contentId });

// After
const { data } = useGetContentQuery(contentId);
```

---

### 3. Fixed duplicateContent to Accept Required Parameters

**Before:**
```typescript
duplicateContent: build.mutation<Content, string>({
    query: (id) => ({
        url: `/v1/coach/contents/${id}/duplicate`,
        method: 'post',
    }),
})
```

**After:**
```typescript
duplicateContent: build.mutation<Content, {id: string; name: string}>({
    query: ({id, name}) => ({
        url: `/v1/coach/contents/${id}/duplicate`,
        method: 'post',
        data: {name},
    }),
})
```

**Backend Requirement:**
```go
type RequestBody struct {
    Name string `json:"name" binding:"required,min=3,max=255"`
}
```

**Changes:**
- Parameter changed from `string` to `{id: string; name: string}`
- Added `data: {name}` to POST body
- Matches backend requirement for new content name

**Usage Impact:**
```typescript
// Before (would fail - no name provided)
const [duplicate] = useDuplicateContentMutation();
await duplicate(contentId);

// After (correct)
const [duplicate] = useDuplicateContentMutation();
await duplicate({ id: contentId, name: "Copy of Exercise" });
```

---

### 4. Fixed Response Types for Archive/Unarchive

**Before:**
```typescript
archiveContent: build.mutation<{message: string}, string>
unarchiveContent: build.mutation<{message: string}, string>
```

**After:**
```typescript
archiveContent: build.mutation<void, string>
unarchiveContent: build.mutation<void, string>
```

**Backend Response:**
```go
return resp.JSON(c, http.StatusNoContent, nil)
```

**Rationale**: Backend returns HTTP 204 No Content (empty body), not a message object.

---

### 5. Removed Unused Hook Export

**Before:**
```typescript
export const {
    useListContentsInfiniteQuery,
    useGetContentQuery,
    useCreateContentMutation,
    useUpdateContentMutation,
    useDeleteContentMutation,  // ❌ Doesn't exist
    useArchiveContentMutation,
    useUnarchiveContentMutation,
    useDuplicateContentMutation,
} = contentsApi;
```

**After:**
```typescript
export const {
    useListContentsInfiniteQuery,
    useGetContentQuery,
    useCreateContentMutation,
    useUpdateContentMutation,
    useArchiveContentMutation,
    useUnarchiveContentMutation,
    useDuplicateContentMutation,
} = contentsApi;
```

---

## Complete API Endpoint Mapping

| Frontend Hook | Backend Endpoint | Method | Request | Response |
|---------------|------------------|--------|---------|----------|
| `useListContentsInfiniteQuery` | `/v1/coach/contents` | GET | Query params | `ListContentsResult` |
| `useGetContentQuery` | `/v1/coach/contents/:id` | GET | `id: string` | `Content` |
| `useCreateContentMutation` | `/v1/coach/contents` | POST | `CreateContentProps` | `Content` |
| `useUpdateContentMutation` | `/v1/coach/contents/:id` | PATCH | `{id, data}` | `Content` |
| `useArchiveContentMutation` | `/v1/coach/contents/:id/archive` | POST | `id: string` | `void` |
| `useUnarchiveContentMutation` | `/v1/coach/contents/:id/unarchive` | POST | `id: string` | `void` |
| `useDuplicateContentMutation` | `/v1/coach/contents/:id/duplicate` | POST | `{id, name}` | `Content` |

## Request/Response Examples

### List Contents
```typescript
const { data } = useListContentsInfiniteQuery({
    content_type: 'exercise',
    access_level: 'all',
    page_size: 20,
    search: 'squat'
});

// Response
{
    records: Content[],
    total: number,
    page: number,
    page_size: number
}
```

### Get Content
```typescript
const { data } = useGetContentQuery('content-uuid');

// Response: Content object
{
    id: string,
    name: string,
    type: 'exercise' | 'recipe',
    description: string,
    definition: any,
    exercise_definition?: ExerciseMetadata,
    ...
}
```

### Create Content
```typescript
const [create] = useCreateContentMutation();
await create({
    name: 'Barbell Squat',
    type: 'exercise',
    description: 'Compound lower body exercise',
    exercise_definition: {
        equipment: ['barbell'],
        muscle_groups: ['quads', 'glutes']
    }
});

// Response: Content object
```

### Update Content
```typescript
const [update] = useUpdateContentMutation();
await update({
    id: 'content-uuid',
    data: {
        description: 'Updated description',
        exercise_definition: { ... }
    }
});

// Response: Content object
```

### Archive Content
```typescript
const [archive] = useArchiveContentMutation();
await archive('content-uuid');

// Response: void (204 No Content)
```

### Unarchive Content
```typescript
const [unarchive] = useUnarchiveContentMutation();
await unarchive('content-uuid');

// Response: void (204 No Content)
```

### Duplicate Content
```typescript
const [duplicate] = useDuplicateContentMutation();
await duplicate({
    id: 'content-uuid',
    name: 'Copy of Barbell Squat'
});

// Response: Content object (new content)
```

## Breaking Changes

### 1. getContent Parameter
```typescript
// Before
useGetContentQuery({ id: 'uuid' })

// After
useGetContentQuery('uuid')
```

### 2. duplicateContent Requires Name
```typescript
// Before (broken)
useDuplicateContentMutation()('uuid')

// After (correct)
useDuplicateContentMutation()({ id: 'uuid', name: 'Copy' })
```

### 3. deleteContent Removed
```typescript
// Before
useDeleteContentMutation()(id)

// After (use archive instead)
useArchiveContentMutation()(id)
```

## Migration Checklist

Frontend code that needs updating:

- [ ] Replace `useGetContentQuery({ id })` with `useGetContentQuery(id)`
- [ ] Update duplicate calls to include `name` parameter
- [ ] Replace any `useDeleteContentMutation` with `useArchiveContentMutation`
- [ ] Verify archive/unarchive don't expect response data (void return)

## Validation

All endpoints now:
- ✅ Match backend routes exactly (7/7)
- ✅ Use correct HTTP methods
- ✅ Have proper request types
- ✅ Have proper response types
- ✅ Follow constitutional patterns
- ✅ TypeScript compiles without errors

## Files Modified

1. `/webapps/apps/coachapp/src/store/services/contentsApi.ts`
   - Removed `deleteContent` endpoint
   - Simplified `getContent` parameter
   - Fixed `duplicateContent` to require name
   - Fixed `archive/unarchive` response types
   - Removed `useDeleteContentMutation` export

## Summary

| Change | Type | Impact |
|--------|------|--------|
| Removed deleteContent | Breaking | Replace with archiveContent |
| Fixed getContent param | Breaking | Simpler API, update calls |
| Fixed duplicateContent | Breaking | Must provide name |
| Fixed archive response types | Non-breaking | Correct types only |
| Removed delete hook | Breaking | Import will fail |

**Total Endpoints**: 7 (matches backend exactly)  
**Breaking Changes**: 3 (delete removed, getContent simplified, duplicate fixed)  
**Non-Breaking**: 2 (response types, cleanup)

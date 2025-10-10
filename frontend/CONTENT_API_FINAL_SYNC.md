# Content API - Backend Sync Complete ✅

## Backend ListContents Parameters (Updated)

```go
type QueryParams struct {
    Search       string `form:"search"`
    Page         int    `form:"page"`
    PageSize     int    `form:"page_size"`
    AccessLevel  string `form:"access_level"`   // all, public, business, private
    ContentType  string `form:"content_type"`   // exercise, ingredient, recipe
    ActiveOnly   *bool  `form:"active_only"`    // true = show only active
    ArchivedOnly *bool  `form:"archived_only"`  // true = show only archived
}
```

## Frontend ListContents Parameters (Synced)

```typescript
export const ListContents_zod = z.object({
    content_type: z.enum(['exercise', 'ingredient', 'recipe']).optional(),
    access_level: AccessLevelFilter_zod,  // 'all' | 'public' | 'business' | 'private'
    active_only: z.boolean().optional(),   // true = show only non-archived
    archived_only: z.boolean().optional(), // true = show only archived
    page: z.number().min(1).optional().default(1),
    page_size: z.number().min(1).max(20).optional().default(20),
    search: z.string().max(60).optional(),
});
```

## Backend Logic

```go
if params.ActiveOnly != nil && *params.ActiveOnly {
    opts = opts.WithBusinessID(claims.BusinessID).WithActiveOnly()
} else if params.ArchivedOnly != nil && *params.ArchivedOnly {
    opts = opts.WithBusinessID(claims.BusinessID).WithArchivedOnly()
} else {
    opts = opts.WithBusinessID(claims.BusinessID).WithIncludeArchived()
}
```

**Behavior:**
- `active_only: true` → Show only non-archived content
- `archived_only: true` → Show only archived content
- Both undefined/false → Show all content (active + archived)

## Frontend Implementation

### Current Usage (ExerciseListPage):
```typescript
useListContentsInfiniteQuery({
    search: search || undefined,
    content_type: 'exercise',
    access_level: accessLevelFilter,  // User selects: all/public/business/private
    active_only: true,                 // Default: show only active content
    page_size: 20,
});
```

### Future Use Cases:

**Show only active content:**
```typescript
{ active_only: true }
```

**Show only archived content:**
```typescript
{ archived_only: true }
```

**Show all content (active + archived):**
```typescript
{ /* don't send active_only or archived_only */ }
// or
{ active_only: false, archived_only: false }
```

## Key Changes from Previous Version

### Before (with filter enum):
```typescript
// ❌ OLD
filter: z.enum(['active', 'archived', 'all']).optional()

// Usage:
{ filter: 'active' }    // Show active
{ filter: 'archived' }  // Show archived
{ filter: 'all' }       // Show all
```

### After (with boolean flags):
```typescript
// ✅ NEW
active_only: z.boolean().optional()
archived_only: z.boolean().optional()

// Usage:
{ active_only: true }              // Show active
{ archived_only: true }            // Show archived
{ /* no flags */ }                 // Show all
```

## Benefits of Boolean Flags

1. **More Explicit**: Clear what each parameter does
2. **Backend Alignment**: Matches backend implementation exactly
3. **Flexible**: Can be extended with more flags if needed
4. **Type Safe**: Boolean type is more explicit than string enum

## Files Updated

- ✅ `src/api/contents.ts` - Updated ListContents_zod schema
- ✅ `src/views/library/exercise/ExerciseListPage.tsx` - Added `active_only: true`

## Compilation Status

✅ All TypeScript files compile without errors

## API Examples

### List all active public exercises:
```typescript
useListContentsInfiniteQuery({
    content_type: 'exercise',
    access_level: 'public',
    active_only: true,
});
```

### List all archived business content:
```typescript
useListContentsInfiniteQuery({
    access_level: 'business',
    archived_only: true,
});
```

### List all exercises (active + archived):
```typescript
useListContentsInfiniteQuery({
    content_type: 'exercise',
    access_level: 'all',
    // Don't set active_only or archived_only
});
```


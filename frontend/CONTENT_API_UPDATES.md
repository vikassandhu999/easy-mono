# Content API Updates - Frontend

## Summary of Backend Changes
The backend has been refactored to:
1. Replace `is_published` (boolean) with `access_level` (enum: draft, public, business, private)
2. Update list filtering to use `filter` for archive status and `access_level` for visibility
3. Move recipe-specific, ingredient-specific, and exercise-specific code to separate files
4. Change `BusinessID` from `*uuid.UUID` to `uuid.NullUUID`

## Frontend Changes Applied

### 1. Updated API Types (contents.ts)

#### Added AccessLevel enum:
```typescript
export const AccessLevelEnum = z.enum(['draft', 'public', 'business', 'private']);
export type AccessLevel = z.infer<typeof AccessLevelEnum>;
```

#### Updated Content interface:
- **Added**: `access_level: AccessLevel`
- **Removed**: `is_published: boolean`

#### Updated CreateContent_zod schema:
- **Added**: `access_level: AccessLevelEnum.optional()`

#### Updated ListContents query parameters:
- **Changed**: `filter` options from `['all', 'public', 'private', 'archived']` to `['active', 'archived', 'all']`
- **Added**: `access_level` parameter for filtering by visibility (public/business/private)
- **Removed**: `include_archived`, `include_metadata`, `include_ui_structure` (only for list, still valid for get single)
- **Default**: `filter` now defaults to `'active'` instead of `'all'`

### 2. Updated ExerciseListPage Component

#### Changes:
- Removed invalid `include_metadata: true` from list query
- Changed default filter from `'all'` to `'active'`
- Filter now correctly uses: `'active'`, `'archived'`, or `'all'`

## API Parameter Reference

### ListContents Parameters (for listing):
```typescript
{
  content_type?: 'exercise' | 'ingredient' | 'recipe';
  access_level?: 'all' | 'public' | 'business' | 'private';
  filter?: 'active' | 'archived' | 'all'; // Default: 'active'
  page?: number;
  page_size?: number;
  search?: string;
}
```

### GetContent Parameters (for single content):
```typescript
{
  id: string;
  includeMetadata?: boolean;      // Default: true
  includeUIStructure?: boolean;   // Default: true
}
```

## Usage Examples

### List active exercises:
```typescript
useListContentsInfiniteQuery({
  content_type: 'exercise',
  filter: 'active',  // Shows only non-archived
  page_size: 20,
});
```

### List archived content:
```typescript
useListContentsInfiniteQuery({
  filter: 'archived',  // Shows only archived
  page_size: 20,
});
```

### List public content only:
```typescript
useListContentsInfiniteQuery({
  access_level: 'public',
  filter: 'active',
  page_size: 20,
});
```

### Create content with access level:
```typescript
useCreateContentMutation({
  name: 'My Exercise',
  type: 'exercise',
  access_level: 'business',  // draft, public, business, or private
  exercise_metadata: {...},
});
```

## Migration Notes

### For Components Using Content List:
1. Remove `include_metadata` from list queries (not supported in list endpoint)
2. Use `filter: 'active'` instead of filtering out archived manually
3. Use `filter: 'archived'` to show archived items
4. Use `access_level` parameter to filter by visibility

### For Components Creating/Updating Content:
1. Use `access_level` instead of `is_published`
2. Values: 'draft', 'public', 'business', or 'private'
3. 'draft' = unpublished, others = published with different visibility

### For Components Reading Content:
1. Check `content.access_level` instead of `content.is_published`
2. Display logic based on access level instead of boolean

## Files Modified:
- ✅ `/api/contents.ts` - Updated types and schemas
- ✅ `/views/library/exercise/ExerciseListPage.tsx` - Fixed query parameters
- ✅ `/store/services/contentsApi.ts` - Already correct (no changes needed)

## Files That May Need Review:
- Search for any components using `is_published` or `isPublished`
- Search for any components passing `include_metadata` to list queries
- Check if any forms need `access_level` selector added


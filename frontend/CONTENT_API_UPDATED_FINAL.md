# Content API Updates - Frontend (FINAL)

## ✅ Changes Applied

### 1. API Types (`src/api/contents.ts`)

#### Added Access Level System:
```typescript
// Access levels for content visibility
export const AccessLevelEnum = z.enum(['draft', 'public', 'business', 'private']);
export type AccessLevel = z.infer<typeof AccessLevelEnum>;

// UI filter options for access level
export const ACCESS_LEVEL_FILTERS = ['all', 'public', 'business', 'private'] as const;
export type AccessLevelFilter = 'all' | 'public' | 'business' | 'private';

// UI filter options for archive status
export const ARCHIVE_STATUS_FILTERS = ['active', 'archived', 'all'] as const;
export type ArchiveStatusFilter = 'active' | 'archived' | 'all';
```

#### Updated Content Interface:
```typescript
export interface Content {
    access_level: AccessLevel;  // ✅ NEW
    // is_published: boolean;    // ❌ REMOVED
    // ... other fields
}
```

#### Updated ListContents Parameters:
```typescript
export const ListContents_zod = z.object({
    content_type: z.enum(['exercise', 'ingredient', 'recipe']).optional(),
    access_level: AccessLevelFilter_zod,  // ✅ For visibility (All/Public/Business/Private)
    filter: ArchiveStatusFilter_zod,       // ✅ For archive status (active/archived/all)
    page: z.number().min(1).optional().default(1),
    page_size: z.number().min(1).max(20).optional().default(20),
    search: z.string().max(60).optional(),
});
```

### 2. UI Component (`src/views/library/exercise/ExerciseListPage.tsx`)

#### Two Separate Filter Sections:

**Access Level Filter** (for content visibility):
- All
- Public  
- Business
- Private

**Status Filter** (for archive status):
- Active (default)
- Archived
- All

```typescript
const [accessLevelFilter, setAccessLevelFilter] = useState<AccessLevelFilter>('all');
const [archiveStatusFilter, setArchiveStatusFilter] = useState<ArchiveStatusFilter>('active');

useListContentsInfiniteQuery({
    content_type: 'exercise',
    access_level: accessLevelFilter,  // Controls visibility
    filter: archiveStatusFilter,       // Controls archive status
    page_size: 20,
});
```

## API Usage Examples

### 1. List All Active Public Exercises
```typescript
useListContentsInfiniteQuery({
    content_type: 'exercise',
    access_level: 'public',    // Show only public content
    filter: 'active',           // Show only non-archived
    page_size: 20,
});
```

### 2. List All Business Content (Including Archived)
```typescript
useListContentsInfiniteQuery({
    content_type: 'exercise',
    access_level: 'business',   // Show only business-level content
    filter: 'all',              // Show both active and archived
    page_size: 20,
});
```

### 3. List Only Archived Content
```typescript
useListContentsInfiniteQuery({
    access_level: 'all',        // All access levels
    filter: 'archived',         // Show only archived
    page_size: 20,
});
```

### 4. Create Content with Access Level
```typescript
useCreateContentMutation({
    name: 'My Exercise',
    type: 'exercise',
    access_level: 'business',   // draft | public | business | private
    exercise_metadata: {...},
});
```

## Parameter Reference

### `access_level` (Content Visibility)
- `'all'` - Show all content regardless of access level (default)
- `'public'` - Show only public content
- `'business'` - Show only business-level content
- `'private'` - Show only private content

### `filter` (Archive Status)
- `'active'` - Show only non-archived content (default)
- `'archived'` - Show only archived content
- `'all'` - Show both active and archived content

### Content `access_level` (on creation/update)
- `'draft'` - Unpublished content
- `'public'` - Published, visible to everyone
- `'business'` - Published, visible to organization
- `'private'` - Published, visible to specific users

## Migration Guide

### For Existing Components:

1. **Replace old filter usage:**
   ```typescript
   // ❌ OLD
   const [filter, setFilter] = useState('all');
   // filter: 'all' | 'public' | 'private' | 'archived'
   
   // ✅ NEW - Separate concerns
   const [accessLevelFilter, setAccessLevelFilter] = useState('all');
   const [archiveStatusFilter, setArchiveStatusFilter] = useState('active');
   ```

2. **Update list query parameters:**
   ```typescript
   // ❌ OLD
   useListContentsInfiniteQuery({
       filter: 'public',  // Mixed visibility and archive status
   });
   
   // ✅ NEW - Separate parameters
   useListContentsInfiniteQuery({
       access_level: 'public',  // For visibility
       filter: 'active',         // For archive status
   });
   ```

3. **Update content property checks:**
   ```typescript
   // ❌ OLD
   if (content.is_published) { ... }
   
   // ✅ NEW
   if (content.access_level !== 'draft') { ... }
   // or check specific levels:
   if (content.access_level === 'public') { ... }
   ```

4. **Remove invalid parameters from list queries:**
   ```typescript
   // ❌ Remove these from LIST queries:
   include_metadata: true,
   include_ui_structure: true,
   
   // ✅ These are only valid for GET single content:
   useGetContentQuery({
       id: contentId,
       includeMetadata: true,
       includeUIStructure: true,
   });
   ```

## Files Modified
- ✅ `src/api/contents.ts` - Updated types and schemas
- ✅ `src/views/library/exercise/ExerciseListPage.tsx` - Implemented dual-filter UI

## TypeScript Build
✅ All files compile without errors


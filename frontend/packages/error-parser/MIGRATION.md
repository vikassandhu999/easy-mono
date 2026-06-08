# Migration Guide: @easy/error-parser

This document guides you through migrating from local error parser utilities to the `@easy/error-parser` package.

## What Changed

The error parser has been moved from individual app utils to a shared monorepo package at `packages/error-parser`.

### Before (Local Utils)
```typescript
import { humanizeError } from '@/utils/error_parser';
import APIErrorParser from '@/utils/error_parser';
```

### After (Shared Package)
```typescript
import { humanizeError } from '@easy/error-parser';
import APIErrorParser from '@easy/error-parser';
```

## Migration Steps

### 1. Add Package Dependency

Add `@easy/error-parser` to your app's `package.json`:

```json
{
  "dependencies": {
    "@easy/error-parser": "workspace:^"
  }
}
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Update Imports

Replace all imports from local utils:

**Find:**
```typescript
import { humanizeError, parseError, getFieldErrors } from '@/utils/error_parser';
import APIErrorParser from '@/utils/error_parser';
```

**Replace with:**
```typescript
import { humanizeError, parseError, getFieldErrors } from '@easy/error-parser';
import APIErrorParser from '@easy/error-parser';
```

### 4. Remove Local Error Parser

Delete the local `error_parser.ts` file from your utils directory:

```bash
rm src/utils/error_parser.ts
```

### 5. Verify

Run your app to ensure everything works:

```bash
npm run dev
```

## Package Features

The `@easy/error-parser` package provides:

### Factory Functions (Recommended)
```typescript
import { parseError, humanizeError, getFieldErrors } from '@easy/error-parser';

// Quick usage
const message = humanizeError(error);

// Full parser instance
const parser = parseError(error);
const message = parser.humanize();
const fields = parser.getFieldErrors();
```

### Convenience Functions
```typescript
import { 
  humanizeError,
  getFieldErrors,
  getFieldError,
  isValidationError 
} from '@easy/error-parser';

const message = humanizeError(error);
const fields = getFieldErrors(error);
const emailError = getFieldError(error, 'email');
const isValidation = isValidationError(error);
```

### Class Instance (If Needed)
```typescript
import APIErrorParser from '@easy/error-parser';

const parser = new APIErrorParser(error);
const message = parser.humanize();
```

## Benefits of Migration

1. **Consistency**: Same error handling across all apps
2. **Maintenance**: Single source of truth for error parsing
3. **Type Safety**: Shared types across the monorepo
4. **Features**: Access to all parser methods and utilities
5. **Updates**: Bug fixes and improvements benefit all apps

## Apps Migrated

- ✅ `coachapp` - Migrated
- ⬜ `clientapp` - Pending

## Troubleshooting

### Import Errors

If you see TypeScript errors about missing modules:

1. Ensure you've run `npm install` after adding the dependency
2. Restart your TypeScript server/IDE
3. Check that the import path is `@easy/error-parser` (not `@/utils/error_parser`)

### Type Errors

If types are not recognized:

1. Check that `@easy/error-parser` is in your `dependencies`
2. Ensure the package has a proper `types` field in its `package.json`
3. Restart your development server

### Runtime Errors

If you get runtime errors:

1. Ensure all import paths have been updated
2. Check that the old `error_parser.ts` file has been removed
3. Clear your build cache: `rm -rf node_modules/.vite`

## API Reference

See [README.md](./README.md) for complete API documentation.

## Need Help?

If you encounter issues during migration, check:

1. The [README.md](./README.md) for usage examples
2. The package source code in `packages/error-parser/src`
3. Existing usage in `apps/coachapp` for reference

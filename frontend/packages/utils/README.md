# @easy/utils

Shared utility functions and error handling for Easy applications.

## Installation

This package is part of the Easy monorepo and is automatically available to all apps in the workspace.

```typescript
import { AppError, ApiErrorCode, Result } from '@easy/utils';
```

## Features

### 🚨 Comprehensive Error Handling
- **AppError Class**: Structured error handling with codes, messages, and details
- **ApiErrorCode Enum**: All backend error codes in one place
- **Automatic Parsing**: Parse Axios errors into structured AppError instances
- **Type-Safe**: Full TypeScript support with proper types

### 🎯 Result Pattern
- Type-safe success/failure handling
- Avoid try-catch boilerplate
- Clear error propagation

### 🛠️ Utility Functions
- `withThrottling`: Throttle function execution
- `withDebouncing`: Debounce function execution
- Date/time formatting utilities

## Quick Start

### Basic Error Handling

```typescript
import { AppError, ApiErrorCode } from '@easy/utils';

try {
  await api.post('/auth/login', credentials);
} catch (err) {
  const error = AppError.fromAxiosError(err);
  
  if (error.isCode(ApiErrorCode.INVALID_OTP)) {
    console.log('Invalid OTP');
  }
}
```

### Using Result Pattern

```typescript
import { Result } from '@easy/utils';

async function fetchUser(id: string): Promise<Result<User>> {
  try {
    const response = await api.get(`/users/${id}`);
    return Result.success(response.data);
  } catch (err) {
    return Result.failure(err);
  }
}

const result = await fetchUser('123');
if (result.isError) {
  console.log(result.getError().message);
} else {
  console.log(result.getValue().name);
}
```

## Documentation

- [Error Handling Guide](./ERROR_HANDLING.md) - Complete guide to error handling
- [Examples](./EXAMPLES.md) - Real-world usage examples

## Backend Error Format

All API errors follow this structure:

```json
{
  "error": {
    "message": "Human-readable error message",
    "code": "MACHINE_READABLE_ERROR_CODE",
    "details": {
      "field_name": ["error messages"]
    }
  }
}
```

## Error Codes

The package includes all error codes from the backend:

- **Validation**: `VALIDATION_ERROR`
- **Authentication**: `INVALID_OTP`, `TOKEN_EXPIRED`, `INVALID_TOKEN`, etc.
- **Authorization**: `UNAUTHORIZED`, `FORBIDDEN`
- **Resources**: `NOT_FOUND`, `USER_NOT_FOUND`, `CONFLICT`
- **Rate Limiting**: `RATE_LIMIT_EXCEEDED`, `MAX_ATTEMPTS_EXCEEDED`
- **Business Logic**: `BUSINESS_EXISTS`, `INVITATION_EXPIRED`, etc.

See [ERROR_HANDLING.md](./ERROR_HANDLING.md) for the complete list.

## Helper Methods

### AppError Methods

```typescript
error.isCode(ApiErrorCode.TOKEN_EXPIRED)  // Check specific code
error.isAuthError()                        // Check if auth error
error.isValidationError()                  // Check if validation error
error.isRateLimitError()                   // Check if rate limit error
error.getValidationErrors()                // Get field-level errors
error.getRetryAfter()                      // Get retry seconds
```

## Integration with React

```typescript
import { getApiErrorMessage, isAuthError } from '@easy/utils';

function MyComponent() {
  const handleSubmit = async () => {
    try {
      await api.post('/endpoint', data);
    } catch (err) {
      const message = getApiErrorMessage(err);
      toast.error(message);
      
      if (isAuthError(err)) {
        navigate('/login');
      }
    }
  };
}
```

## Contributing

When adding new error codes:

1. Add to `ApiErrorCode` enum in `src/index.ts`
2. Update documentation in `ERROR_HANDLING.md`
3. Add examples in `EXAMPLES.md`

## License

ISC

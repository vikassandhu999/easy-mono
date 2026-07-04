# Error Handling Guide

This package provides comprehensive error handling utilities for parsing and working with API errors from the Easy backend.

## Backend Error Format

The backend returns errors in the following standardized format:

```json
{
  "error": {
    "message": "Human-readable error message",
    "code": "MACHINE_READABLE_ERROR_CODE",
    "details": {
      "field_name": ["error message"]
    }
  }
}
```

## AppError Class

The `AppError` class represents a structured error with code, message, and optional details.

```typescript
import { AppError, ApiErrorCode } from '@easy/utils';

// Create a custom error
const error = new AppError('User not found', ApiErrorCode.USER_NOT_FOUND);

// Add status code
error.withStatusCode(404);

// Check error type
if (error.isAuthError()) {
  // Handle authentication error
}

// Check specific error code
if (error.isCode(ApiErrorCode.TOKEN_EXPIRED)) {
  // Refresh token
}
```

## Parsing Axios Errors

The `AppError.fromAxiosError()` method automatically parses Axios errors:

```typescript
import { AppError } from '@easy/utils';
import axios from 'axios';

try {
  await axios.get('/api/users');
} catch (err) {
  const appError = AppError.fromAxiosError(err);
  console.log(appError.message); // "User not found"
  console.log(appError.code);    // "USER_NOT_FOUND"
  console.log(appError.details); // { ... }
}
```

## Result Pattern

The `Result` class provides a type-safe way to handle success and error cases:

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

// Usage
const result = await fetchUser('123');
if (result.isError) {
  const error = result.getError();
  console.log(error.message);
} else {
  const user = result.getValue();
  console.log(user.name);
}
```

## Error Codes

All API error codes are defined in the `ApiErrorCode` enum:

### Validation Errors
- `VALIDATION_ERROR` - Request data failed validation

### Authentication Errors
- `INVALID_OTP` - Invalid OTP code
- `TOKEN_EXPIRED` - Token has expired
- `TOKEN_USED` - Token already used
- `TOKEN_NOT_FOUND` - Token not found
- `INVALID_TOKEN_TYPE` - Wrong token type
- `INVALID_REFRESH_TOKEN` - Invalid refresh token
- `INVALID_TOKEN` - Invalid access token

### Session Errors
- `SESSION_NOT_FOUND` - Session not found or revoked

### Rate Limiting
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `MAX_ATTEMPTS_EXCEEDED` - Max verification attempts exceeded

### Authorization
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Insufficient permissions

### Resource Errors
- `NOT_FOUND` - Resource not found
- `USER_NOT_FOUND` - User not found
- `CONFLICT` - Resource conflict
- `ALREADY_EXISTS` - Resource already exists
- `ALREADY_ASSIGNED` - Already assigned

### Business Logic
- `BUSINESS_EXISTS` - User already owns a business
- `INVITATION_EXPIRED` - Invitation expired
- `INVITATION_USED` - Invitation already used
- `METADATA_VALIDATION_FAILED` - Metadata validation failed

### Operation Errors
- `OTP_GENERATION_FAILED` - Failed to generate OTP
- `OTP_VERIFICATION_FAILED` - Failed to verify OTP
- `REGISTRATION_ERROR` - Registration failed
- `REFRESH_FAILED` - Token refresh failed
- `LOGOUT_FAILED` - Logout failed

### Server Errors
- `INTERNAL_ERROR` - Internal server error
- `BAD_REQUEST` - Bad request
- `UNPROCESSABLE_ENTITY` - Unprocessable entity

## Helper Methods

### Check Error Types

```typescript
// Check if authentication error
if (error.isAuthError()) {
  // Redirect to login
}

// Check if validation error
if (error.isValidationError()) {
  const errors = error.getValidationErrors();
  // Display field errors
}

// Check if rate limit error
if (error.isRateLimitError()) {
  const retryAfter = error.getRetryAfter();
  // Show retry message
}
```

## Usage in React Components

```typescript
import { AppError } from '@easy/utils';

function MyComponent() {
  const [error, setError] = useState<unknown>(null);

  const handleSubmit = async () => {
    try {
      await api.post('/auth/login', data);
    } catch (err) {
      setError(err);
      
      const appError = AppError.fromAxiosError(err);
      toast.error(appError.message);
      
      // Handle specific errors
      if (appError.isAuthError()) {
        navigate('/login');
      }
    }
  };
}
```

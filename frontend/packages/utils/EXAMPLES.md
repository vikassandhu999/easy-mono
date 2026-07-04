# Error Handling Examples

## Example 1: Basic Error Parsing

```typescript
import { AppError, ApiErrorCode } from '@easy/utils';
import axios from 'axios';

async function loginUser(email: string, password: string) {
  try {
    const response = await axios.post('/api/auth/login', { email, password });
    return response.data;
  } catch (err) {
    const error = AppError.fromAxiosError(err);
    
    // Check specific error codes
    if (error.isCode(ApiErrorCode.INVALID_OTP)) {
      console.log('Invalid OTP code');
    } else if (error.isCode(ApiErrorCode.TOKEN_EXPIRED)) {
      console.log('Token expired, please login again');
    }
    
    throw error;
  }
}
```

## Example 2: Handling Validation Errors

```typescript
import { AppError, ApiErrorCode } from '@easy/utils';

async function registerUser(data: RegisterData) {
  try {
    const response = await axios.post('/api/auth/register', data);
    return response.data;
  } catch (err) {
    const error = AppError.fromAxiosError(err);
    
    if (error.isValidationError()) {
      const validationErrors = error.getValidationErrors();
      // validationErrors = { email: ["has already been taken"], full_name: ["can't be blank"] }
      
      Object.entries(validationErrors || {}).forEach(([field, messages]) => {
        console.log(`${field}: ${messages.join(', ')}`);
      });
    }
    
    throw error;
  }
}
```

## Example 3: Handling Rate Limits

```typescript
import { AppError, ApiErrorCode } from '@easy/utils';

async function sendOTP(email: string) {
  try {
    const response = await axios.post('/api/auth/send-otp', { email, type: 'login' });
    return response.data;
  } catch (err) {
    const error = AppError.fromAxiosError(err);
    
    if (error.isRateLimitError()) {
      const retryAfter = error.getRetryAfter();
      if (retryAfter) {
        console.log(`Rate limited. Please try again in ${retryAfter} seconds`);
        // Show countdown timer
      }
    }
    
    throw error;
  }
}
```

## Example 4: Using Result Pattern

```typescript
import { Result, AppError } from '@easy/utils';

async function fetchUserProfile(userId: string): Promise<Result<User>> {
  try {
    const response = await axios.get(`/api/users/${userId}`);
    return Result.success(response.data);
  } catch (err) {
    return Result.failure(err);
  }
}

// Usage
const result = await fetchUserProfile('123');

if (result.isError) {
  const error = result.getError();
  
  if (error.isAuthError()) {
    // Redirect to login
    router.push('/login');
  } else {
    // Show error message
    toast.error(error.message);
  }
} else {
  const user = result.getValue();
  console.log(user.name);
}
```

## Example 5: React Component with Error Handling

```typescript
import { useState } from 'react';
import { AppError } from '@easy/utils';

function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  
  const handleSubmit = async (email: string, password: string) => {
    try {
      const response = await api.post('/api/auth/login', { email, password });
      // Handle success
    } catch (err) {
      const appError = AppError.fromAxiosError(err);
      setError(appError.message);
      
      // Handle specific error types
      if (appError.isAuthError()) {
        // Clear stored tokens
        localStorage.removeItem('token');
      }
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}
      {/* form fields */}
    </form>
  );
}
```

## Example 6: RTK Query Integration

```typescript
import { AppError } from '@easy/utils';
import { createApi } from '@reduxjs/toolkit/query/react';

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: axiosBaseQuery(),
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (credentials) => ({
        url: '/api/auth/login',
        method: 'POST',
        data: credentials,
      }),
      transformErrorResponse: (error) => {
        const appError = AppError.fromAxiosError(error);
        return {
          message: appError.message,
          code: appError.code,
        };
      },
    }),
  }),
});

// Usage in component
function LoginPage() {
  const [login, { isLoading, error }] = useLoginMutation();
  
  const handleLogin = async (data) => {
    try {
      await login(data).unwrap();
    } catch (err) {
      const errorCode = getApiErrorCode(err);
      
      if (errorCode === ApiErrorCode.INVALID_OTP) {
        // Show OTP error
      } else if (errorCode === ApiErrorCode.RATE_LIMIT_EXCEEDED) {
        // Show rate limit message
      }
    }
  };
}
```

## Example 7: Global Error Handler

```typescript
import { AppError, ApiErrorCode } from '@easy/utils';
import axios from 'axios';

// Setup global error interceptor
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const appError = AppError.fromAxiosError(error);
    
    // Handle authentication errors globally
    if (appError.isAuthError()) {
      // Clear tokens
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      
      // Redirect to login
      window.location.href = '/login';
    }
    
    // Handle rate limits globally
    if (appError.isRateLimitError()) {
      const retryAfter = appError.getRetryAfter();
      // Show global notification
      showNotification(`Too many requests. Please wait ${retryAfter} seconds.`);
    }
    
    return Promise.reject(appError);
  }
);
```

## Backend Error Response Examples

### Validation Error (422)
```json
{
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "details": {
      "email": ["has already been taken"],
      "full_name": ["can't be blank"]
    }
  }
}
```

### Authentication Error (401)
```json
{
  "error": {
    "message": "The token has expired",
    "code": "TOKEN_EXPIRED",
    "details": null
  }
}
```

### Rate Limit Error (429)
```json
{
  "error": {
    "message": "Rate limit exceeded. Please try again in 300 seconds",
    "code": "RATE_LIMIT_EXCEEDED",
    "details": {
      "retry_after": 300
    }
  }
}
```

### Not Found Error (404)
```json
{
  "error": {
    "message": "User not found",
    "code": "USER_NOT_FOUND",
    "details": null
  }
}
```

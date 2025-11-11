# Simple Error Handling Guide

## The Problem We Solved

Backend returns errors like this:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "email": ["has already been taken"],
      "full_name": ["can't be blank"]
    }
  }
}
```

We needed a simple way to show user-friendly messages without messy code.

## The Solution

### One Function: `handleApiError(err)`

That's it! Just call this function in your catch block.

```typescript
import { handleApiError } from '@/utils/error';

try {
  await api.post('/auth/register', data);
} catch (err) {
  handleApiError(err);
}
```

## What It Does Automatically

### 1. Converts Validation Errors to Readable Messages

**Backend sends:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "details": {
      "email": ["has already been taken"]
    }
  }
}
```

**User sees notification:**
```
"email has already been taken"
```

### 2. Shows Appropriate Notifications

- **Validation errors** → Red notification with field errors
- **Rate limit errors** → Orange notification with retry time
- **Auth errors** → Red notification
- **Other errors** → Red notification

### 3. Logs Debug Info

Console shows full error details:
```javascript
[API Error] {
  message: "email has already been taken",
  code: "VALIDATION_ERROR",
  details: { email: ["has already been taken"] },
  raw: { /* full error object */ }
}
```

## Real Example

### RegisterPage.tsx

```typescript
const onSubmit = async (values: RegisterRequest) => {
  try {
    const resp = await registerMutation(values).unwrap();
    
    notifications.show({
      title: 'Success',
      message: 'Check your email',
      color: 'green',
    });
    
    navigate('/verify');
  } catch (err) {
    handleApiError(err);  // ← That's it!
  }
};
```

## Error Message Examples

### Validation Error
```
Input: { email: ["has already been taken"], full_name: ["can't be blank"] }
Output: "email has already been taken, full_name can't be blank"
```

### Rate Limit Error
```
Input: { retry_after: 300 }
Output: "Please try again in 300 seconds"
```

### Auth Error
```
Input: { code: "TOKEN_EXPIRED", message: "Token has expired" }
Output: "Token has expired"
```

### Generic Error
```
Input: { code: "NOT_FOUND", message: "User not found" }
Output: "User not found"
```

## Options (Optional)

If you need to customize behavior:

```typescript
// Disable notification (silent error)
handleApiError(err, { showNotification: false });

// Disable debug logging
handleApiError(err, { debugLog: false });

// Both
handleApiError(err, { 
  showNotification: false, 
  debugLog: false 
});
```

## That's It!

No need to:
- ❌ Parse error objects manually
- ❌ Check error types
- ❌ Format messages
- ❌ Show notifications manually
- ❌ Set form field errors
- ❌ Write 50 lines of error handling

Just:
- ✅ Call `handleApiError(err)`

## Quick Reference

```typescript
// Import
import { handleApiError } from '@/utils/error';

// Use in any try-catch
try {
  await api.call();
} catch (err) {
  handleApiError(err);
}
```

Done! 🎉

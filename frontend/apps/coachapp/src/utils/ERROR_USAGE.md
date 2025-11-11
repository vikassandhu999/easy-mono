# Error Handling Usage Guide

## Quick Reference

### For Forms (with React Hook Form)

Use `handleFormError` - it handles everything automatically:

```typescript
import { handleFormError } from '@/utils/error';

const onSubmit = async (values: FormData) => {
  try {
    const resp = await mutation(values).unwrap();
    // Handle success
  } catch (err) {
    handleFormError(err, form.setError);
  }
};
```

**What it does:**
- ✅ Shows appropriate notification (validation, rate limit, auth, or generic error)
- ✅ Sets field-level errors on the form for validation errors
- ✅ Logs detailed error info to console for debugging
- ✅ Returns user-friendly error message

### For Non-Form Actions

Use `handleApiError` - simpler version without form handling:

```typescript
import { handleApiError } from '@/utils/error';

const deleteItem = async (id: string) => {
  try {
    await api.delete(`/items/${id}`);
    // Handle success
  } catch (err) {
    handleApiError(err);
  }
};
```

**What it does:**
- ✅ Shows appropriate notification
- ✅ Logs detailed error info to console
- ✅ Returns user-friendly error message

### Options

Both functions accept optional configuration:

```typescript
// Disable notifications (useful for silent errors)
handleApiError(err, { showNotification: false });

// Disable debug logging (for production)
handleApiError(err, { debugLog: false });

// Both options
handleFormError(err, form.setError, { 
  showNotification: false, 
  debugLog: false 
});
```

## Examples

### Example 1: Registration Form

```typescript
const RegisterPage = () => {
  const form = useForm<RegisterRequest>();
  const [register] = useRegisterMutation();

  const onSubmit = async (values: RegisterRequest) => {
    try {
      const resp = await register(values).unwrap();
      notifications.show({
        title: 'Success',
        message: 'Check your email for verification',
        color: 'green',
      });
      navigate('/verify');
    } catch (err) {
      handleFormError(err, form.setError);
    }
  };
};
```

### Example 2: Delete Action (No Form)

```typescript
const deleteClient = async (clientId: string) => {
  try {
    await api.delete(`/clients/${clientId}`);
    notifications.show({
      title: 'Success',
      message: 'Client deleted',
      color: 'green',
    });
  } catch (err) {
    handleApiError(err);
  }
};
```

### Example 3: Custom Error Handling

If you need custom logic based on error type:

```typescript
import { 
  getApiErrorMessage, 
  isAuthError, 
  isRateLimitError,
  getRetryAfter 
} from '@/utils/error';

try {
  await api.post('/endpoint', data);
} catch (err) {
  const message = getApiErrorMessage(err);
  
  if (isAuthError(err)) {
    // Redirect to login
    navigate('/login');
  } else if (isRateLimitError(err)) {
    const retryAfter = getRetryAfter(err);
    // Show countdown timer
    startCountdown(retryAfter);
  }
  
  // Still show notification
  handleApiError(err);
}
```

### Example 4: Silent Error (No Notification)

```typescript
const checkAvailability = async (email: string) => {
  try {
    await api.get(`/check-email?email=${email}`);
    return true;
  } catch (err) {
    // Log error but don't show notification
    handleApiError(err, { showNotification: false });
    return false;
  }
};
```

## Error Types Handled

### Validation Errors (422)
- Sets field-level errors on form
- Shows red notification
- Example: "Email has already been taken"

### Rate Limit Errors (429)
- Shows orange notification with retry time
- Example: "Please try again in 300 seconds"

### Authentication Errors (401)
- Shows red notification
- Example: "Token has expired"

### Other Errors
- Shows red notification
- Example: "Something went wrong"

## Debug Output

In development, errors are logged to console with full details:

```javascript
[API Error] {
  message: "Email has already been taken",
  code: "VALIDATION_ERROR",
  details: { email: ["has already been taken"] },
  raw: { /* full error object */ }
}
```

## Migration Guide

### Before (Messy)
```typescript
catch (err) {
  const errorMessage = getApiErrorMessage(err);
  
  if (isValidationError(err)) {
    const validationErrors = getValidationErrors(err);
    if (validationErrors) {
      Object.entries(validationErrors).forEach(([field, messages]) => {
        form.setError(field, { type: 'manual', message: messages.join(', ') });
      });
    }
    notifications.show({ title: 'Validation Error', message: errorMessage, color: 'red' });
  } else if (isRateLimitError(err)) {
    const retryAfter = getRetryAfter(err);
    notifications.show({ title: 'Rate Limit', message: errorMessage, color: 'orange' });
  } else {
    notifications.show({ title: 'Error', message: errorMessage, color: 'red' });
  }
  console.error('Error:', err);
}
```

### After (Clean)
```typescript
catch (err) {
  handleFormError(err, form.setError);
}
```

## Best Practices

1. **Always use the helper functions** - Don't manually parse errors
2. **Let notifications handle user feedback** - No need for error state in most cases
3. **Check console for debugging** - All errors are logged with full details
4. **Use `handleFormError` for forms** - It sets field errors automatically
5. **Use `handleApiError` for non-form actions** - Simpler, no form handling

# API Error Codes Reference

## Overview

This document provides a comprehensive reference for all error codes used in the Easy coaching platform API. All error responses follow a consistent format with machine-readable error codes.

---

## Error Response Format

All error responses use the following JSON structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error description",
    "details": {
      "field": "Additional context (optional)"
    }
  }
}
```

**Fields:**

- `code` (string): Machine-readable error code (uppercase with underscores)
- `message` (string): Human-readable error description
- `details` (object, optional): Additional context, often field-level validation errors

---

## Error Code Categories

### Validation Errors (4xx)

Errors related to invalid request data or failed validation.

### Authentication Errors (4xx)

Errors related to authentication, tokens, and sessions.

### Authorization Errors (4xx)

Errors related to permissions and access control.

### Resource Errors (4xx)

Errors related to resource existence and conflicts.

### Rate Limiting Errors (429)

Errors related to rate limiting and throttling.

### Business Logic Errors (4xx)

Errors related to business rules and constraints.

### Server Errors (5xx)

Errors related to server-side issues.

---

## Complete Error Code Reference

### Validation Errors

#### VALIDATION_ERROR

**HTTP Status:** 422 Unprocessable Entity

**Description:** Request data failed validation.

**Example Response:**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "email": ["can't be blank"],
      "full_name": ["is too short (minimum is 2 characters)"]
    }
  }
}
```

**Common Causes:**

- Missing required fields
- Invalid field formats (e.g., invalid email)
- Field length constraints violated
- Invalid data types

**Resolution:**

- Check request body against API documentation
- Ensure all required fields are present
- Validate field formats before sending

---

### Authentication Errors

#### INVALID_OTP

**HTTP Status:** 400 Bad Request

**Description:** The provided OTP code is invalid or has expired.

**Example Response:**

```json
{
  "error": {
    "code": "INVALID_OTP",
    "message": "The provided code is invalid or has expired",
    "attempts_remaining": 2
  }
}
```

**Common Causes:**

- Incorrect OTP code entered
- OTP has expired (10 minute timeout)
- OTP has already been used

**Resolution:**

- Verify the OTP code from email
- Request a new OTP if expired
- Check for typos in the code

---

#### TOKEN_EXPIRED

**HTTP Status:** 410 Gone

**Description:** The token has expired and can no longer be used.

**Example Response:**

```json
{
  "error": {
    "code": "TOKEN_EXPIRED",
    "message": "The token has expired"
  }
}
```

**Common Causes:**

- OTP token expired (10 minutes)
- Invitation token expired (7 days)
- Access token expired (7 days)

**Resolution:**

- Request a new OTP or invitation
- Use refresh token to get new access token
- Re-authenticate if refresh token expired

---

#### TOKEN_USED

**HTTP Status:** 410 Gone

**Description:** The token has already been used and cannot be reused.

**Example Response:**

```json
{
  "error": {
    "code": "TOKEN_USED",
    "message": "The token has already been used"
  }
}
```

**Common Causes:**

- Attempting to verify OTP twice
- Attempting to accept invitation twice
- Token replay attack

**Resolution:**

- Request a new token
- Check if operation already succeeded

---

#### TOKEN_NOT_FOUND

**HTTP Status:** 404 Not Found

**Description:** The specified token does not exist.

**Example Response:**

```json
{
  "error": {
    "code": "TOKEN_NOT_FOUND",
    "message": "Token not found"
  }
}
```

**Common Causes:**

- Invalid token_id provided
- Token was deleted
- Typo in token_id

**Resolution:**

- Verify the token_id is correct
- Request a new token

---

#### INVALID_TOKEN_TYPE

**HTTP Status:** 400 Bad Request

**Description:** Token type mismatch - the token cannot be used for this operation.

**Example Response:**

```json
{
  "error": {
    "code": "INVALID_TOKEN_TYPE",
    "message": "Token type mismatch. This token cannot be used for this operation."
  }
}
```

**Common Causes:**

- Using email_verification token for login
- Using login token for email_verification
- Using client_invitation token for coach registration

**Resolution:**

- Use the correct token type for the operation
- Request appropriate token for the flow

---

#### INVALID_REFRESH_TOKEN

**HTTP Status:** 401 Unauthorized

**Description:** The refresh token is invalid or has expired.

**Example Response:**

```json
{
  "error": {
    "code": "INVALID_REFRESH_TOKEN",
    "message": "The refresh token is invalid or has expired"
  }
}
```

**Common Causes:**

- Refresh token expired (30 days)
- Invalid refresh token format
- Session was revoked

**Resolution:**

- Re-authenticate to get new tokens
- Check if user logged out

---

#### INVALID_TOKEN

**HTTP Status:** 401 Unauthorized

**Description:** The access token is invalid or has expired.

**Example Response:**

```json
{
  "error": {
    "code": "INVALID_TOKEN",
    "message": "The access token is invalid or has expired"
  }
}
```

**Common Causes:**

- Access token expired (7 days)
- Invalid token format
- Token signature verification failed

**Resolution:**

- Use refresh token to get new access token
- Re-authenticate if refresh token expired

---

#### SESSION_NOT_FOUND

**HTTP Status:** 401 Unauthorized

**Description:** Session not found or has been revoked.

**Example Response:**

```json
{
  "error": {
    "code": "SESSION_NOT_FOUND",
    "message": "Session not found or has been revoked"
  }
}
```

**Common Causes:**

- User logged out
- Session was revoked
- Session expired and cleaned up

**Resolution:**

- Re-authenticate to create new session

---

### Rate Limiting Errors

#### RATE_LIMIT_EXCEEDED

**HTTP Status:** 429 Too Many Requests

**Description:** Rate limit exceeded for this operation.

**Example Response:**

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Please try again in 300 seconds",
    "retry_after": 300
  }
}
```

**Common Causes:**

- Too many OTP requests (max 3 per 15 minutes per email)
- Too many API requests in short time

**Resolution:**

- Wait for the retry_after period
- Implement exponential backoff
- Check for request loops in client code

**Rate Limits:**

- OTP Generation: 3 requests per email per 15 minutes
- OTP Verification: 3 attempts per token

---

#### MAX_ATTEMPTS_EXCEEDED

**HTTP Status:** 429 Too Many Requests

**Description:** Maximum verification attempts exceeded.

**Example Response:**

```json
{
  "error": {
    "code": "MAX_ATTEMPTS_EXCEEDED",
    "message": "Maximum verification attempts exceeded"
  }
}
```

**Common Causes:**

- Failed OTP verification 3 times
- Brute force attempt detected

**Resolution:**

- Request a new OTP
- Verify correct code before submitting

---

### Authorization Errors

#### UNAUTHORIZED

**HTTP Status:** 401 Unauthorized

**Description:** Authentication required to access this resource.

**Example Response:**

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**Common Causes:**

- Missing Authorization header
- Invalid or expired access token
- Accessing protected endpoint without authentication

**Resolution:**

- Include valid access token in Authorization header
- Refresh token if expired
- Re-authenticate if necessary

---

#### FORBIDDEN

**HTTP Status:** 403 Forbidden

**Description:** Insufficient permissions to access this resource.

**Example Response:**

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied"
  }
}
```

**Common Causes:**

- User lacks required role (coach/client)
- Attempting to access another business's resources
- Insufficient permissions for operation

**Resolution:**

- Verify user has correct role
- Check business_id matches user's business
- Contact administrator for permission changes

---

### Resource Errors

#### NOT_FOUND

**HTTP Status:** 404 Not Found

**Description:** The requested resource does not exist.

**Example Response:**

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found"
  }
}
```

**Common Causes:**

- Invalid resource ID
- Resource was deleted
- Typo in URL or ID

**Resolution:**

- Verify the resource ID is correct
- Check if resource exists
- Verify URL path is correct

---

#### USER_NOT_FOUND

**HTTP Status:** 404 Not Found

**Description:** The specified user does not exist.

**Example Response:**

```json
{
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "User not found"
  }
}
```

**Common Causes:**

- Invalid user ID
- User was deleted
- User never existed

**Resolution:**

- Verify user ID is correct
- Check if user account exists

---

#### CONFLICT

**HTTP Status:** 409 Conflict

**Description:** The request conflicts with the current state of the resource.

**Example Response:**

```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Resource conflict detected"
  }
}
```

**Common Causes:**

- Concurrent modification
- Resource state conflict
- Duplicate operation

**Resolution:**

- Retry the operation
- Refresh resource state
- Check for duplicate requests

---

#### ALREADY_EXISTS

**HTTP Status:** 422 Unprocessable Entity

**Description:** A resource with these attributes already exists.

**Example Response:**

```json
{
  "error": {
    "code": "ALREADY_EXISTS",
    "message": "Email has already been taken",
    "details": {
      "email": ["has already been taken"]
    }
  }
}
```

**Common Causes:**

- Duplicate email registration
- Duplicate business name
- Unique constraint violation

**Resolution:**

- Use different values for unique fields
- Check if resource already exists
- Use idempotent endpoints where available

---

#### ALREADY_ASSIGNED

**HTTP Status:** 422 Unprocessable Entity

**Description:** Client is already assigned to this coach.

**Example Response:**

```json
{
  "error": {
    "code": "ALREADY_ASSIGNED",
    "message": "Client is already assigned to this coach"
  }
}
```

**Common Causes:**

- Attempting to assign client twice
- Duplicate assignment request

**Resolution:**

- Check existing assignments
- No action needed if already assigned

---

### Business Logic Errors

#### BUSINESS_EXISTS

**HTTP Status:** 422 Unprocessable Entity

**Description:** User already owns a business.

**Example Response:**

```json
{
  "error": {
    "code": "BUSINESS_EXISTS",
    "message": "User already owns a business"
  }
}
```

**Common Causes:**

- Attempting to create second business
- User already completed onboarding

**Resolution:**

- Use existing business
- Check onboarding status before creating

**Note:** The business creation endpoint is idempotent and will return the existing business with HTTP 200 instead of this error.

---

#### INVITATION_EXPIRED

**HTTP Status:** 410 Gone

**Description:** The invitation has expired.

**Example Response:**

```json
{
  "error": {
    "code": "INVITATION_EXPIRED",
    "message": "This invitation has expired"
  }
}
```

**Common Causes:**

- Invitation older than 7 days
- Invitation manually expired

**Resolution:**

- Request new invitation from coach
- Contact coach for assistance

---

#### INVITATION_USED

**HTTP Status:** 410 Gone

**Description:** The invitation has already been used.

**Example Response:**

```json
{
  "error": {
    "code": "INVITATION_USED",
    "message": "This invitation has already been used"
  }
}
```

**Common Causes:**

- Client already accepted invitation
- Attempting to reuse invitation

**Resolution:**

- Login with existing account
- Contact coach if issue persists

---

#### METADATA_VALIDATION_FAILED

**HTTP Status:** 400 Bad Request

**Description:** Invitation metadata validation failed.

**Example Response:**

```json
{
  "error": {
    "code": "METADATA_VALIDATION_FAILED",
    "message": "Invitation metadata validation failed: client_id mismatch"
  }
}
```

**Common Causes:**

- Corrupted invitation token
- Tampered metadata
- Invalid invitation state

**Resolution:**

- Request new invitation
- Contact support if issue persists

---

### Operation Errors

#### OTP_GENERATION_FAILED

**HTTP Status:** 422 Unprocessable Entity

**Description:** Failed to generate OTP.

**Example Response:**

```json
{
  "error": {
    "code": "OTP_GENERATION_FAILED",
    "message": "Failed to generate OTP"
  }
}
```

**Common Causes:**

- Email service unavailable
- Database error
- System configuration issue

**Resolution:**

- Retry the operation
- Contact support if issue persists

---

#### OTP_VERIFICATION_FAILED

**HTTP Status:** 422 Unprocessable Entity

**Description:** Failed to verify OTP.

**Example Response:**

```json
{
  "error": {
    "code": "OTP_VERIFICATION_FAILED",
    "message": "Failed to verify OTP"
  }
}
```

**Common Causes:**

- Database error
- System configuration issue

**Resolution:**

- Retry the operation
- Contact support if issue persists

---

#### REGISTRATION_ERROR

**HTTP Status:** 422 Unprocessable Entity

**Description:** Registration failed.

**Example Response:**

```json
{
  "error": {
    "code": "REGISTRATION_ERROR",
    "message": "Registration failed"
  }
}
```

**Common Causes:**

- Database error
- Email service unavailable
- System configuration issue

**Resolution:**

- Retry the operation
- Check validation errors
- Contact support if issue persists

---

#### REFRESH_FAILED

**HTTP Status:** 401 Unauthorized

**Description:** Failed to refresh token.

**Example Response:**

```json
{
  "error": {
    "code": "REFRESH_FAILED",
    "message": "Failed to refresh token"
  }
}
```

**Common Causes:**

- Invalid refresh token
- Session revoked
- Database error

**Resolution:**

- Re-authenticate
- Check if session was revoked

---

#### LOGOUT_FAILED

**HTTP Status:** 422 Unprocessable Entity

**Description:** Failed to logout.

**Example Response:**

```json
{
  "error": {
    "code": "LOGOUT_FAILED",
    "message": "Failed to logout"
  }
}
```

**Common Causes:**

- Database error
- Session already revoked

**Resolution:**

- Retry the operation
- Session may already be revoked

---

### Server Errors

#### INTERNAL_ERROR

**HTTP Status:** 500 Internal Server Error

**Description:** An unexpected error occurred on the server.

**Example Response:**

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An error occurred while processing your request"
  }
}
```

**Common Causes:**

- Unhandled exception
- Database connection failure
- External service failure

**Resolution:**

- Retry the operation
- Contact support with request details
- Check system status page

---

## HTTP Status Code Summary

| Status Code | Category     | Description                       |
| ----------- | ------------ | --------------------------------- |
| 200         | Success      | Request succeeded                 |
| 201         | Success      | Resource created                  |
| 400         | Client Error | Bad request or invalid data       |
| 401         | Client Error | Authentication required or failed |
| 403         | Client Error | Insufficient permissions          |
| 404         | Client Error | Resource not found                |
| 409         | Client Error | Resource conflict                 |
| 410         | Client Error | Resource gone (expired/used)      |
| 422         | Client Error | Validation failed                 |
| 429         | Client Error | Rate limit exceeded               |
| 500         | Server Error | Internal server error             |

---

## Error Handling Best Practices

### Client-Side Error Handling

```javascript
async function handleApiRequest(url, options) {
  try {
    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      // Handle error based on error code
      switch (data.error.code) {
        case "TOKEN_EXPIRED":
          // Attempt token refresh
          return await refreshAndRetry(url, options);

        case "RATE_LIMIT_EXCEEDED":
          // Wait and retry
          const retryAfter = data.error.retry_after || 60;
          await sleep(retryAfter * 1000);
          return await handleApiRequest(url, options);

        case "VALIDATION_ERROR":
          // Show field-level errors to user
          showValidationErrors(data.error.details);
          break;

        case "UNAUTHORIZED":
          // Redirect to login
          redirectToLogin();
          break;

        default:
          // Show generic error message
          showError(data.error.message);
      }

      throw new Error(data.error.message);
    }

    return data;
  } catch (error) {
    console.error("API request failed:", error);
    throw error;
  }
}
```

### Retry Logic

For transient errors (rate limiting, server errors), implement exponential backoff:

```javascript
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      const shouldRetry = ["RATE_LIMIT_EXCEEDED", "INTERNAL_ERROR"].includes(
        error.code
      );

      if (!shouldRetry) throw error;

      const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
      await sleep(delay);
    }
  }
}
```

---

## Related Documentation

- [Authentication API](./AUTHENTICATION_API.md) - Authentication endpoint details
- [Streamlined Flows](./STREAMLINED_FLOWS.md) - Complete user journey documentation
- [API Structure](./API_STRUCTURE.md) - Overall API architecture

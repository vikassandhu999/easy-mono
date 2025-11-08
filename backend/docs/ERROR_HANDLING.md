# Error Handling Guide

This document describes the standardized error handling approach for the Easy API.

## Overview

The API uses a centralized error handling system that provides consistent error responses across all endpoints. All errors follow a standard JSON format with appropriate HTTP status codes.

## Error Response Format

All API errors follow this JSON structure:

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

## HTTP Status Codes

- **400 Bad Request**: Invalid request parameters or malformed data
- **401 Unauthorized**: Authentication required or invalid credentials
- **403 Forbidden**: Authenticated but insufficient permissions
- **404 Not Found**: Resource does not exist
- **410 Gone**: Resource existed but is no longer available (expired tokens)
- **422 Unprocessable Entity**: Validation errors or business logic failures
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Unexpected server errors

## Error Categories

### Authentication Errors (401 Unauthorized)

These errors occur when authentication is required but missing or invalid.

| Error Code      | Description                          | HTTP Status |
| --------------- | ------------------------------------ | ----------- |
| `MISSING_TOKEN` | No Authorization header present      | 401         |
| `INVALID_TOKEN` | Token signature invalid or malformed | 401         |
| `EXPIRED_TOKEN` | Token has expired                    | 401         |
| `UNAUTHORIZED`  | General authentication required      | 401         |

**Example Response:**

```json
{
  "error": {
    "message": "Missing or invalid authorization header",
    "code": "MISSING_TOKEN",
    "details": null
  }
}
```

**Headers:**

- `WWW-Authenticate: Bearer` (included with all 401 responses)

### Authorization Errors (403 Forbidden)

These errors occur when the user is authenticated but lacks permission for the requested action.

| Error Code          | Description                               | HTTP Status |
| ------------------- | ----------------------------------------- | ----------- |
| `FORBIDDEN`         | General permission denied                 | 403         |
| `BUSINESS_MISMATCH` | Resource belongs to different business    | 403         |
| `MISSING_CONTEXT`   | Business context required but not present | 403         |

**Example Response:**

```json
{
  "error": {
    "message": "Resource does not belong to your business context",
    "code": "BUSINESS_MISMATCH",
    "details": null
  }
}
```

### Validation Errors (422 Unprocessable Entity)

These errors occur when request data fails validation.

**Example Response:**

```json
{
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "details": {
      "email": ["can't be blank", "must be a valid email"],
      "full_name": ["can't be blank"]
    }
  }
}
```

### Resource Errors (404 Not Found)

These errors occur when a requested resource does not exist.

**Example Response:**

```json
{
  "error": {
    "message": "Coach not found",
    "code": "NOT_FOUND",
    "details": null
  }
}
```

## Using Error Handling in Controllers

### Option 1: Using the ErrorHandler Module (Recommended)

The `EasyWeb.ErrorHandler` module provides a centralized way to handle errors from service methods.

```elixir
defmodule EasyWeb.MyController do
  use EasyWeb, :controller
  import EasyWeb.ErrorHandler

  def show(conn, %{"id" => id}) do
    scope = conn.assigns[:scope]

    case MyContext.get_resource(scope, id) do
      {:ok, resource} ->
        json(conn, %{resource: resource})

      {:error, reason} ->
        handle_error(conn, reason)
    end
  end
end
```

The `handle_error/2` function automatically converts service layer errors to appropriate HTTP responses:

- `:forbidden` → 403 Forbidden
- `:business_mismatch` → 403 Forbidden with BUSINESS_MISMATCH code
- `:missing_context` → 403 Forbidden with MISSING_CONTEXT code
- `:not_found` → 404 Not Found
- `:unauthorized` → 401 Unauthorized
- `%Ecto.Changeset{}` → 422 Unprocessable Entity with validation details
- Other atoms/strings → 422 Unprocessable Entity

### Option 2: Manual Error Handling

For more control, you can manually create and render errors:

```elixir
defmodule EasyWeb.MyController do
  use EasyWeb, :controller
  alias Easy.ApiError

  def show(conn, %{"id" => id}) do
    scope = conn.assigns[:scope]

    case MyContext.get_resource(scope, id) do
      {:ok, resource} ->
        json(conn, %{resource: resource})

      {:error, :forbidden} ->
        error = ApiError.from_code(:forbidden, nil, nil)
        render_error(conn, error)

      {:error, :not_found} ->
        error = ApiError.not_found("Resource")
        render_error(conn, error)
    end
  end

  defp render_error(conn, %ApiError{} = error) do
    conn = maybe_add_headers(conn, error)

    conn
    |> put_status(error.status)
    |> json(ApiError.to_json(error))
  end

  defp maybe_add_headers(conn, %ApiError{headers: nil}), do: conn

  defp maybe_add_headers(conn, %ApiError{headers: headers}) do
    Enum.reduce(headers, conn, fn {key, value}, acc ->
      put_resp_header(acc, key, value)
    end)
  end
end
```

## Service Layer Error Patterns

Service methods should return errors using standard tuples:

```elixir
defmodule Easy.MyContext do
  def get_resource(scope, id) do
    # Authorization check
    with :ok <- Authorization.authorize_access(scope, id),
         resource <- Repo.get(Resource, id) do
      if resource do
        {:ok, resource}
      else
        {:error, :not_found}
      end
    else
      {:error, :forbidden} -> {:error, :forbidden}
      {:error, reason} -> {:error, reason}
    end
  end

  def create_resource(scope, attrs) do
    # Business context check
    if scope.business_id do
      %Resource{}
      |> Resource.changeset(attrs)
      |> Ecto.Changeset.put_change(:business_id, scope.business_id)
      |> Repo.insert()
    else
      {:error, :missing_context}
    end
  end
end
```

## Common Error Patterns

### Authorization Errors

```elixir
# General permission denied
{:error, :forbidden}

# Resource in different business
{:error, :business_mismatch}

# Business context required
{:error, :missing_context}
```

### Resource Errors

```elixir
# Resource not found
{:error, :not_found}

# Specific resource not found
{:error, {:not_found, "Coach"}}
```

### Validation Errors

```elixir
# Return changeset directly
{:error, %Ecto.Changeset{}}
```

### Custom Errors

```elixir
# Simple error with reason
{:error, :custom_reason}

# Error with details
{:error, {:custom_reason, %{detail: "value"}}}
```

## Authentication Plug

The `EasyWeb.Plugs.AuthenticateToken` plug automatically handles authentication errors:

- Missing Authorization header → `MISSING_TOKEN` (401)
- Invalid token signature → `INVALID_TOKEN` (401)
- Expired token → `EXPIRED_TOKEN` (401)
- Invalid claims → `INVALID_TOKEN` (401)

All authentication errors include the `WWW-Authenticate: Bearer` header.

## Best Practices

1. **Use ErrorHandler**: Import and use `EasyWeb.ErrorHandler.handle_error/2` for consistent error handling
2. **Return Standard Tuples**: Service methods should return `{:ok, result}` or `{:error, reason}`
3. **Use Specific Error Codes**: Use specific error atoms (`:forbidden`, `:business_mismatch`) instead of generic ones
4. **Include Details**: For validation errors, include field-level details in the changeset
5. **Don't Leak Sensitive Info**: Sanitize error messages to avoid exposing internal implementation details
6. **Log Authorization Failures**: Log all authorization failures for security monitoring

## Testing Error Responses

```elixir
test "returns 403 when user lacks permission", %{conn: conn} do
  conn = get(conn, "/api/resources/123")

  assert json_response(conn, 403) == %{
    "error" => %{
      "message" => "Access denied",
      "code" => "FORBIDDEN",
      "details" => nil
    }
  }
end

test "returns 401 when token is missing", %{conn: conn} do
  conn =
    conn
    |> delete_req_header("authorization")
    |> get("/api/resources/123")

  assert json_response(conn, 401) == %{
    "error" => %{
      "message" => "Missing or invalid authorization header",
      "code" => "MISSING_TOKEN",
      "details" => nil
    }
  }

  assert get_resp_header(conn, "www-authenticate") == ["Bearer"]
end
```

## Complete Error Code Reference

See `lib/easy_web/controllers/api_error_codes.ex` for the complete list of error codes and their definitions.

# Authorization Helpers

This document describes the centralized authorization helpers available in `EasyWeb.Authorization`.

## Overview

The `EasyWeb.Authorization` module provides reusable authorization functions that can be used across controllers to verify user permissions. All functions return `:ok` on success or `{:error, reason}` on failure.

## Business Authorization

### `user_belongs_to_business?/2`

Verifies that a user belongs to a business (as owner or coach).

```elixir
case EasyWeb.Authorization.user_belongs_to_business?(user, business) do
  :ok -> 
    # User has access
  {:error, :forbidden} -> 
    # User does not have access
  {:error, :not_found} -> 
    # Business not found (when passing business_id)
end
```

**Parameters:**
- `user` - The user struct
- `business` - The business struct or business_id (integer)

### `user_is_business_owner?/2`

Verifies that a user is the owner of a business.

```elixir
case EasyWeb.Authorization.user_is_business_owner?(user, business) do
  :ok -> 
    # User is the owner
  {:error, :forbidden} -> 
    # User is not the owner
end
```

**Parameters:**
- `user` - The user struct
- `business` - The business struct or business_id (integer)

## Coach Authorization

### `user_is_coach_in_business?/2`

Verifies that a user is a coach in a specific business.

```elixir
case EasyWeb.Authorization.user_is_coach_in_business?(user, business_id) do
  :ok -> 
    # User is a coach in the business
  {:error, :forbidden} -> 
    # User is not a coach in the business
end
```

**Parameters:**
- `user` - The user struct or user_id (integer)
- `business_id` - The business ID (integer)

### `coach_can_access_client?/2`

Verifies that a coach can access a client (both belong to same business).

```elixir
case EasyWeb.Authorization.coach_can_access_client?(coach, client) do
  :ok -> 
    # Coach can access the client
  {:error, :forbidden} -> 
    # Coach cannot access the client
end
```

**Parameters:**
- `coach` - The coach struct (must have `business_id`)
- `client` - The client struct (must have `business_id`)

### `user_can_access_coach?/2`

Verifies that a user can access a coach profile. User can access if they:
- Own the coach profile (user_id matches)
- Are the business owner
- Are another coach in the same business

```elixir
case EasyWeb.Authorization.user_can_access_coach?(user, coach) do
  :ok -> 
    # User can access the coach
  {:error, :forbidden} -> 
    # User cannot access the coach
  {:error, :not_found} -> 
    # Business not found
end
```

**Parameters:**
- `user` - The user struct
- `coach` - The coach struct (must have `user_id` and `business_id`)

## Client Authorization

### `user_is_client?/1`

Verifies that a user is a client (has a client profile).

```elixir
case EasyWeb.Authorization.user_is_client?(user) do
  :ok -> 
    # User has a client profile
  {:error, :forbidden} -> 
    # User does not have a client profile
end
```

**Parameters:**
- `user` - The user struct (must have `client` association preloaded)

### `client_belongs_to_business?/2`

Verifies that a client belongs to a specific business.

```elixir
case EasyWeb.Authorization.client_belongs_to_business?(client, business_id) do
  :ok -> 
    # Client belongs to the business
  {:error, :forbidden} -> 
    # Client does not belong to the business
end
```

**Parameters:**
- `client` - The client struct (must have `business_id`)
- `business_id` - The business ID (integer)

### `user_can_access_client?/2`

Verifies that a user can access a client. User can access if they:
- Are the client themselves (user_id matches)
- Are a coach in the same business as the client

```elixir
case EasyWeb.Authorization.user_can_access_client?(user, client) do
  :ok -> 
    # User can access the client
  {:error, :forbidden} -> 
    # User cannot access the client
end
```

**Parameters:**
- `user` - The user struct
- `client` - The client struct (must have `user_id` and `business_id`)

**Note:** This function handles pending clients (where `user_id` is `nil`) by only allowing coaches in the business to access them.

## Usage Examples

### In Controllers

```elixir
defmodule EasyWeb.BusinessController do
  use EasyWeb, :controller
  
  alias EasyWeb.Authorization

  def show(conn, %{"id" => id}) do
    user = conn.assigns.current_user
    
    case Organizations.get_business(id) do
      nil ->
        conn
        |> put_status(:not_found)
        |> json(%{error: %{message: "Business not found", code: "not_found"}})
      
      business ->
        case Authorization.user_belongs_to_business?(user, business) do
          :ok ->
            conn |> json(%{business: format_business(business)})
          
          {:error, :forbidden} ->
            conn
            |> put_status(:forbidden)
            |> json(%{error: %{message: "Forbidden", code: "forbidden"}})
        end
    end
  end
  
  def update(conn, %{"id" => id} = params) do
    user = conn.assigns.current_user
    
    case Organizations.get_business(id) do
      nil ->
        conn
        |> put_status(:not_found)
        |> json(%{error: %{message: "Business not found", code: "not_found"}})
      
      business ->
        case Authorization.user_is_business_owner?(user, business) do
          :ok ->
            # Proceed with update
            case Organizations.update_business(business, params) do
              {:ok, updated_business} ->
                conn |> json(%{business: format_business(updated_business)})
              
              {:error, changeset} ->
                conn
                |> put_status(:unprocessable_entity)
                |> json(%{error: %{message: "Validation failed"}})
            end
          
          {:error, :forbidden} ->
            conn
            |> put_status(:forbidden)
            |> json(%{error: %{message: "Only the owner can update", code: "forbidden"}})
        end
    end
  end
end
```

### With Pattern Matching

```elixir
def assign_client(conn, %{"id" => coach_id, "client_id" => client_id}) do
  user = conn.assigns.current_user
  
  with {:ok, coach} <- get_coach_or_error(coach_id),
       {:ok, client} <- get_client_or_error(client_id),
       :ok <- Authorization.user_can_access_coach?(user, coach),
       :ok <- Authorization.coach_can_access_client?(coach, client),
       {:ok, assignment} <- Coaches.assign_client(coach.id, client.id) do
    
    conn
    |> put_status(:created)
    |> json(%{assignment: format_assignment(assignment)})
  else
    {:error, :coach_not_found} ->
      not_found(conn, "Coach not found")
    
    {:error, :client_not_found} ->
      not_found(conn, "Client not found")
    
    {:error, :forbidden} ->
      forbidden(conn, "You do not have permission")
  end
end
```

## Migration Guide

If you have existing authorization logic in your controllers, you can replace it with these helpers:

### Before

```elixir
# In BusinessController
defp user_belongs_to_business?(user, business) do
  import Ecto.Query
  
  if business.owner_id == user.id do
    true
  else
    query = from c in Easy.Organizations.Coach,
      where: c.user_id == ^user.id and c.business_id == ^business.id,
      limit: 1
    
    Repo.exists?(query)
  end
end

# Usage
if user_belongs_to_business?(user, business) do
  # Allow access
else
  # Deny access
end
```

### After

```elixir
# Import the module
alias EasyWeb.Authorization

# Usage
case Authorization.user_belongs_to_business?(user, business) do
  :ok -> 
    # Allow access
  {:error, :forbidden} -> 
    # Deny access
end
```

## Benefits

1. **Centralized Logic**: All authorization logic is in one place, making it easier to maintain and update
2. **Consistent Error Handling**: All functions return the same error format
3. **Reusable**: Can be used across all controllers
4. **Testable**: Easy to unit test authorization logic in isolation
5. **Type Safe**: Clear function signatures with documentation

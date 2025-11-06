defmodule EasyWeb.BusinessController do
  use EasyWeb, :controller

  alias Easy.{Organizations, Repo}

  action_fallback EasyWeb.FallbackController

  @moduledoc """
  Business controller for managing business resources.

  Handles:
  - GET /api/businesses/:id - Get business details
  - PATCH /api/businesses/:id - Update business (owner only)
  - GET /api/businesses/:id/coaches - List business coaches
  - GET /api/businesses/:id/clients - List business clients with pagination
  - GET /api/businesses/:id/subscription - Get business subscription
  """

  @doc """
  GET /api/businesses/:id

  Retrieves business details for the authenticated user.

  ## Authorization
  User must belong to the business (as owner or coach).

  ## Response

  Success (200):
  ```json
  {
    "business": {
      "id": "456",
      "name": "Coaching Pro",
      "slug": "coaching-pro",
      "description": "Professional coaching services",
      "owner_id": "123",
      "status": "active"
    }
  }
  ```

  ## Error Responses

  Not found (404):
  ```json
  {
    "error": {
      "message": "Business not found",
      "code": "not_found"
    }
  }
  ```

  Forbidden (403):
  ```json
  {
    "error": {
      "message": "You do not have permission to access this business",
      "code": "forbidden"
    }
  }
  ```
  """
  def show(conn, %{"id" => id}) do
    user = conn.assigns.current_user

    case Organizations.get_business(id) do
      nil ->
        conn
        |> put_status(:not_found)
        |> json(%{
          error: %{
            message: "Business not found",
            code: "not_found",
            details: nil
          }
        })

      business ->
        # Check if user belongs to this business
        if user_belongs_to_business?(user, business) do
          conn
          |> json(%{
            business: format_business(business)
          })
        else
          conn
          |> put_status(:forbidden)
          |> json(%{
            error: %{
              message: "You do not have permission to access this business",
              code: "forbidden",
              details: nil
            }
          })
        end
    end
  end

  @doc """
  PATCH /api/businesses/:id

  Updates business information.

  ## Authorization
  User must be the business owner.

  ## Parameters
  - name: Business name (optional)
  - description: Business description (optional)

  ## Response

  Success (200):
  ```json
  {
    "business": {
      "id": "456",
      "name": "Updated Name",
      "slug": "coaching-pro",
      "description": "Updated description",
      "owner_id": "123",
      "status": "active"
    }
  }
  ```

  ## Error Responses

  Forbidden (403):
  ```json
  {
    "error": {
      "message": "Only the business owner can update business information",
      "code": "forbidden"
    }
  }
  ```

  Validation error (422):
  ```json
  {
    "error": {
      "message": "Validation failed",
      "code": "validation_error",
      "details": {
        "name": ["can't be blank"]
      }
    }
  }
  ```
  """
  def update(conn, %{"id" => id} = params) do
    user = conn.assigns.current_user

    case Organizations.get_business(id) do
      nil ->
        conn
        |> put_status(:not_found)
        |> json(%{
          error: %{
            message: "Business not found",
            code: "not_found",
            details: nil
          }
        })

      business ->
        # Check if user is the owner
        if business.owner_id == user.id do
          # Extract update attributes
          attrs = Map.take(params, ["name", "description"])

          case Organizations.update_business(business, attrs) do
            {:ok, updated_business} ->
              conn
              |> json(%{
                business: format_business(updated_business)
              })

            {:error, changeset} ->
              conn
              |> put_status(:unprocessable_entity)
              |> json(%{
                error: %{
                  message: "Validation failed",
                  code: "validation_error",
                  details: translate_changeset_errors(changeset)
                }
              })
          end
        else
          conn
          |> put_status(:forbidden)
          |> json(%{
            error: %{
              message: "Only the business owner can update business information",
              code: "forbidden",
              details: nil
            }
          })
        end
    end
  end

  @doc """
  GET /api/businesses/:id/coaches

  Lists all coaches in the business.

  ## Authorization
  User must belong to the business.

  ## Response

  Success (200):
  ```json
  {
    "coaches": [
      {
        "id": "789",
        "user_id": "123",
        "business_id": "456",
        "status": "active",
        "bio": "Experienced coach",
        "specialties": ["life coaching", "career coaching"],
        "credentials": {}
      }
    ]
  }
  ```
  """
  def list_coaches(conn, %{"id" => id}) do
    user = conn.assigns.current_user

    case Organizations.get_business(id) do
      nil ->
        conn
        |> put_status(:not_found)
        |> json(%{
          error: %{
            message: "Business not found",
            code: "not_found",
            details: nil
          }
        })

      business ->
        # Check if user belongs to this business
        if user_belongs_to_business?(user, business) do
          coaches =
            Organizations.list_business_coaches(business.id)
            |> Repo.preload(:user)

          conn
          |> json(%{
            coaches: Enum.map(coaches, &format_coach/1)
          })
        else
          conn
          |> put_status(:forbidden)
          |> json(%{
            error: %{
              message: "You do not have permission to access this business",
              code: "forbidden",
              details: nil
            }
          })
        end
    end
  end

  @doc """
  GET /api/businesses/:id/clients

  Lists all clients in the business with pagination.

  ## Authorization
  User must belong to the business.

  ## Query Parameters
  - limit: Number of results per page (default: 50, max: 100)
  - offset: Number of results to skip (default: 0)
  - status: Filter by client status (optional)

  ## Response

  Success (200):
  ```json
  {
    "clients": [
      {
        "id": "202",
        "email": "client@example.com",
        "full_name": "Jane Client",
        "phone": "+1234567890",
        "status": "active",
        "business_id": "456"
      }
    ],
    "pagination": {
      "limit": 50,
      "offset": 0,
      "total": 150
    }
  }
  ```
  """
  def list_clients(conn, %{"id" => id} = params) do
    user = conn.assigns.current_user

    case Organizations.get_business(id) do
      nil ->
        conn
        |> put_status(:not_found)
        |> json(%{
          error: %{
            message: "Business not found",
            code: "not_found",
            details: nil
          }
        })

      business ->
        # Check if user belongs to this business
        if user_belongs_to_business?(user, business) do
          # Parse pagination parameters
          limit = parse_limit(params["limit"])
          offset = parse_offset(params["offset"])
          status = params["status"]

          # Build options
          opts = [limit: limit, offset: offset]
          opts = if status, do: Keyword.put(opts, :status, status), else: opts

          # Get clients
          clients =
            Organizations.list_business_clients(business.id, opts)
            |> Repo.preload(:user)

          # Get total count for pagination
          total = count_business_clients(business.id, status)

          conn
          |> json(%{
            clients: Enum.map(clients, &format_client/1),
            pagination: %{
              limit: limit,
              offset: offset,
              total: total
            }
          })
        else
          conn
          |> put_status(:forbidden)
          |> json(%{
            error: %{
              message: "You do not have permission to access this business",
              code: "forbidden",
              details: nil
            }
          })
        end
    end
  end

  @doc """
  GET /api/businesses/:id/subscription

  Retrieves the active subscription for the business.

  ## Authorization
  User must belong to the business.

  ## Response

  Success (200):
  ```json
  {
    "subscription": {
      "id": "101",
      "business_id": "456",
      "plan_id": "1",
      "status": "active",
      "started_at": "2024-01-01T00:00:00Z",
      "current_period_start": "2024-01-01T00:00:00Z",
      "current_period_end": "2024-02-01T00:00:00Z",
      "plan": {
        "id": "1",
        "name": "Free",
        "slug": "free",
        "price_cents": 0,
        "billing_interval": "month"
      }
    }
  }
  ```

  Not found (404):
  ```json
  {
    "error": {
      "message": "No active subscription found",
      "code": "not_found"
    }
  }
  ```
  """
  def show_subscription(conn, %{"id" => id}) do
    user = conn.assigns.current_user

    case Organizations.get_business(id) do
      nil ->
        conn
        |> put_status(:not_found)
        |> json(%{
          error: %{
            message: "Business not found",
            code: "not_found",
            details: nil
          }
        })

      business ->
        # Check if user belongs to this business
        if user_belongs_to_business?(user, business) do
          case Organizations.get_subscription(business.id) do
            nil ->
              conn
              |> put_status(:not_found)
              |> json(%{
                error: %{
                  message: "No active subscription found",
                  code: "not_found",
                  details: nil
                }
              })

            subscription ->
              # Preload plan
              subscription = Repo.preload(subscription, :plan)

              conn
              |> json(%{
                subscription: format_subscription(subscription)
              })
          end
        else
          conn
          |> put_status(:forbidden)
          |> json(%{
            error: %{
              message: "You do not have permission to access this business",
              code: "forbidden",
              details: nil
            }
          })
        end
    end
  end

  # ============================================
  # PRIVATE HELPERS
  # ============================================

  # Checks if user belongs to a business (as owner or coach)
  defp user_belongs_to_business?(user, business) do
    import Ecto.Query

    # User is owner
    if business.owner_id == user.id do
      true
    else
      # User is a coach in the business
      query =
        from c in Easy.Coaches.Coach,
          where: c.user_id == ^user.id and c.business_id == ^business.id,
          limit: 1

      Repo.exists?(query)
    end
  end

  # Counts total clients in a business with optional status filter
  defp count_business_clients(business_id, status) do
    import Ecto.Query

    query =
      from c in Easy.Clients.Client,
        where: c.business_id == ^business_id

    query =
      if status do
        from c in query, where: c.status == ^status
      else
        query
      end

    Repo.aggregate(query, :count)
  end

  # Parses limit parameter with validation
  defp parse_limit(nil), do: 50

  defp parse_limit(limit) when is_binary(limit) do
    case Integer.parse(limit) do
      {num, _} when num > 0 and num <= 100 -> num
      _ -> 50
    end
  end

  defp parse_limit(limit) when is_integer(limit) and limit > 0 and limit <= 100, do: limit
  defp parse_limit(_), do: 50

  # Parses offset parameter with validation
  defp parse_offset(nil), do: 0

  defp parse_offset(offset) when is_binary(offset) do
    case Integer.parse(offset) do
      {num, _} when num >= 0 -> num
      _ -> 0
    end
  end

  defp parse_offset(offset) when is_integer(offset) and offset >= 0, do: offset
  defp parse_offset(_), do: 0

  # Formats business for JSON response
  defp format_business(business) do
    %{
      id: to_string(business.id),
      name: business.name,
      slug: business.slug,
      description: business.description,
      owner_id: to_string(business.owner_id),
      status: business.status
    }
  end

  # Formats coach for JSON response
  defp format_coach(coach) do
    %{
      id: to_string(coach.id),
      user_id: to_string(coach.user_id),
      business_id: to_string(coach.business_id),
      status: coach.status,
      bio: coach.bio,
      specialties: coach.specialties || [],
      credentials: coach.credentials || %{},
      user: if(coach.user, do: format_user(coach.user), else: nil)
    }
  end

  # Formats client for JSON response
  defp format_client(client) do
    %{
      id: to_string(client.id),
      email: client.email,
      full_name: client.full_name,
      phone: client.phone,
      status: client.status,
      business_id: to_string(client.business_id),
      user_id: if(client.user_id, do: to_string(client.user_id), else: nil),
      notes: client.notes
    }
  end

  # Formats user for JSON response
  defp format_user(user) do
    %{
      id: to_string(user.id),
      email: user.email,
      full_name: user.full_name,
      email_verified: user.email_verified
    }
  end

  # Formats subscription with plan for JSON response
  defp format_subscription(subscription) do
    %{
      id: to_string(subscription.id),
      business_id: to_string(subscription.business_id),
      plan_id: to_string(subscription.plan_id),
      status: subscription.status,
      started_at: subscription.started_at,
      current_period_start: subscription.current_period_start,
      current_period_end: subscription.current_period_end,
      cancelled_at: subscription.cancelled_at,
      plan: if(subscription.plan, do: format_plan(subscription.plan), else: nil)
    }
  end

  # Formats plan for JSON response
  defp format_plan(plan) do
    %{
      id: to_string(plan.id),
      name: plan.name,
      slug: plan.slug,
      description: plan.description,
      price_cents: plan.price_cents,
      billing_interval: plan.billing_interval,
      features: plan.features,
      limits: plan.limits
    }
  end

  # Translates changeset errors to a map of field => [errors]
  defp translate_changeset_errors(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Regex.replace(~r"%{(\w+)}", msg, fn _, key ->
        opts |> Keyword.get(String.to_existing_atom(key), key) |> to_string()
      end)
    end)
  end
end

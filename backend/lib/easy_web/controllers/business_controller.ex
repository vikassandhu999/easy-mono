defmodule EasyWeb.BusinessController do
  use EasyWeb, :controller

  alias Easy.{Organizations, ApiError}
  alias EasyWeb.ResponseHelpers

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
    scope = conn.assigns[:scope]

    case Organizations.get_business(scope, id) do
      {:ok, business} ->
        conn
        |> json(%{business: format_business(business)})

      {:error, :not_found} ->
        error = ApiError.not_found("Business")
        render_error(conn, error)

      {:error, :forbidden} ->
        error = ApiError.forbidden("You do not have permission to access this business")
        render_error(conn, error)
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
    scope = conn.assigns[:scope]

    # Extract update attributes
    attrs = Map.take(params, ["name", "description"])

    case Organizations.update_business(scope, id, attrs) do
      {:ok, updated_business} ->
        conn
        |> json(%{business: format_business(updated_business)})

      {:error, :not_found} ->
        error = ApiError.not_found("Business")
        render_error(conn, error)

      {:error, :forbidden} ->
        error = ApiError.forbidden("Only the business owner can update business information")
        render_error(conn, error)

      {:error, %Ecto.Changeset{} = changeset} ->
        error = ApiError.validation_error(changeset)
        render_error(conn, error)

      {:error, reason} ->
        error =
          ApiError.unprocessable_entity("Failed to update business", %{reason: to_string(reason)})

        render_error(conn, error)
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
    scope = conn.assigns[:scope]

    case Organizations.list_business_coaches(scope, id) do
      {:ok, coaches} ->
        conn
        |> json(%{coaches: Enum.map(coaches, &format_coach/1)})

      {:error, :not_found} ->
        error = ApiError.not_found("Business")
        render_error(conn, error)

      {:error, :forbidden} ->
        error = ApiError.forbidden("You do not have permission to access this business")
        render_error(conn, error)

      {:error, reason} ->
        error =
          ApiError.unprocessable_entity("Failed to list coaches", %{reason: to_string(reason)})

        render_error(conn, error)
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
    scope = conn.assigns[:scope]

    # Parse pagination parameters
    limit = parse_limit(params["limit"])
    offset = parse_offset(params["offset"])
    status = params["status"]

    # Build options
    opts = [limit: limit, offset: offset]
    opts = if status, do: Keyword.put(opts, :status, status), else: opts

    case Organizations.list_business_clients(scope, id, opts) do
      {:ok, clients, total} ->
        conn
        |> json(%{
          clients: Enum.map(clients, &format_client/1),
          pagination: ResponseHelpers.format_pagination(limit, offset, total)
        })

      {:error, :not_found} ->
        error = ApiError.not_found("Business")
        render_error(conn, error)

      {:error, :forbidden} ->
        error = ApiError.forbidden("You do not have permission to access this business")
        render_error(conn, error)

      {:error, reason} ->
        error =
          ApiError.unprocessable_entity("Failed to list clients", %{reason: to_string(reason)})

        render_error(conn, error)
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
    scope = conn.assigns[:scope]

    case Organizations.get_business_subscription(scope, id) do
      {:ok, subscription} ->
        conn
        |> json(%{subscription: format_subscription(subscription)})

      {:error, :business_not_found} ->
        error = ApiError.not_found("Business")
        render_error(conn, error)

      {:error, :not_found} ->
        error = ApiError.not_found("Subscription")
        error = %{error | message: "No active subscription found"}
        render_error(conn, error)

      {:error, :forbidden} ->
        error = ApiError.forbidden("You do not have permission to access this business")
        render_error(conn, error)

      {:error, reason} ->
        error =
          ApiError.unprocessable_entity("Failed to retrieve subscription", %{
            reason: to_string(reason)
          })

        render_error(conn, error)
    end
  end

  # ============================================
  # PRIVATE HELPERS
  # ============================================

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
  defp format_business(business), do: ResponseHelpers.format_business(business)

  # Formats coach for JSON response
  defp format_coach(coach), do: ResponseHelpers.format_coach(coach)

  # Formats client for JSON response
  defp format_client(client), do: ResponseHelpers.format_client(client)

  # Formats subscription with plan for JSON response
  defp format_subscription(subscription), do: ResponseHelpers.format_subscription(subscription)

  # Renders an API error response
  defp render_error(conn, %ApiError{} = error) do
    conn = maybe_add_headers(conn, error)

    conn
    |> put_status(error.status)
    |> json(ApiError.to_json(error))
  end

  # Adds headers from ApiError to the connection if present
  defp maybe_add_headers(conn, %ApiError{headers: nil}), do: conn

  defp maybe_add_headers(conn, %ApiError{headers: headers}) do
    Enum.reduce(headers, conn, fn {key, value}, acc ->
      put_resp_header(acc, key, value)
    end)
  end
end

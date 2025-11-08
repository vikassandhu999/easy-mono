defmodule EasyWeb.CoachController do
  use EasyWeb, :controller

  alias Easy.{Coaches, ApiError}
  alias EasyWeb.ResponseHelpers

  action_fallback EasyWeb.FallbackController

  @moduledoc """
  Coach controller for managing coach resources.

  Handles:
  - GET /api/coaches/:id - Get coach details
  - PATCH /api/coaches/:id - Update coach profile (ownership required)
  - GET /api/coaches/:id/clients - List coach's assigned clients
  - POST /api/coaches/:id/clients/:client_id/assign - Assign client to coach
  - DELETE /api/coaches/:id/clients/:client_id/unassign - Unassign client from coach
  """

  @doc """
  GET /api/coaches/:id

  Retrieves coach details for the authenticated user.

  ## Authorization
  User must belong to the same business as the coach.

  ## Response

  Success (200):
  ```json
  {
    "coach": {
      "id": "789",
      "user_id": "123",
      "business_id": "456",
      "status": "active",
      "bio": "Experienced coach",
      "specialties": ["life coaching", "career coaching"],
      "credentials": {},
      "user": {
        "id": "123",
        "email": "coach@example.com",
        "full_name": "John Coach"
      }
    }
  }
  ```

  ## Error Responses

  Not found (404):
  ```json
  {
    "error": {
      "message": "Coach not found",
      "code": "not_found"
    }
  }
  ```

  Forbidden (403):
  ```json
  {
    "error": {
      "message": "You do not have permission to access this coach",
      "code": "forbidden"
    }
  }
  ```
  """
  def show(conn, %{"id" => id}) do
    scope = conn.assigns[:scope]

    case Coaches.get_coach(scope, id) do
      {:ok, coach} ->
        conn
        |> json(%{coach: format_coach(coach)})

      {:error, :not_found} ->
        error = ApiError.not_found("Coach")
        render_error(conn, error)

      {:error, :forbidden} ->
        error = ApiError.forbidden("You do not have permission to access this coach")
        render_error(conn, error)
    end
  end

  @doc """
  PATCH /api/coaches/:id

  Updates coach profile information.

  ## Authorization
  User must be the owner of the coach profile (user_id must match).

  ## Parameters
  - bio: Coach biography (optional)
  - specialties: Array of specialties (optional)
  - credentials: Map of credentials (optional)

  ## Response

  Success (200):
  ```json
  {
    "coach": {
      "id": "789",
      "user_id": "123",
      "business_id": "456",
      "status": "active",
      "bio": "Updated bio",
      "specialties": ["life coaching"],
      "credentials": {"certification": "ICF"}
    }
  }
  ```

  ## Error Responses

  Forbidden (403):
  ```json
  {
    "error": {
      "message": "You can only update your own coach profile",
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
        "bio": ["is too long"]
      }
    }
  }
  ```
  """
  def update(conn, %{"id" => id} = params) do
    scope = conn.assigns[:scope]

    # Extract update attributes
    attrs = Map.take(params, ["bio", "specialties", "credentials"])

    case Coaches.update_coach(scope, id, attrs) do
      {:ok, updated_coach} ->
        conn
        |> json(%{coach: format_coach(updated_coach)})

      {:error, :not_found} ->
        error = ApiError.not_found("Coach")
        render_error(conn, error)

      {:error, :forbidden} ->
        error = ApiError.forbidden("You can only update your own coach profile")
        render_error(conn, error)

      {:error, %Ecto.Changeset{} = changeset} ->
        error = ApiError.validation_error(changeset)
        render_error(conn, error)
    end
  end

  @doc """
  GET /api/coaches/:id/clients

  Lists all clients assigned to the coach.

  ## Authorization
  User must be the owner of the coach profile or belong to the same business.

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
    ]
  }
  ```
  """
  def list_clients(conn, %{"id" => id}) do
    scope = conn.assigns[:scope]

    case Coaches.list_coach_clients(scope, id) do
      {:ok, clients} ->
        conn
        |> json(%{clients: Enum.map(clients, &format_client/1)})

      {:error, :not_found} ->
        error = ApiError.not_found("Coach")
        render_error(conn, error)

      {:error, :forbidden} ->
        error = ApiError.forbidden("You do not have permission to access this coach")
        render_error(conn, error)

      {:error, reason} ->
        error =
          ApiError.unprocessable_entity("Failed to list clients", %{reason: to_string(reason)})

        render_error(conn, error)
    end
  end

  @doc """
  POST /api/coaches/:id/clients/:client_id/assign

  Assigns a client to a coach.

  ## Authorization
  User must belong to the same business as the coach and have permission to manage assignments.

  ## Response

  Success (201):
  ```json
  {
    "assignment": {
      "coach_id": "789",
      "client_id": "202",
      "assigned_at": "2024-01-01T00:00:00Z"
    }
  }
  ```

  ## Error Responses

  Already assigned (422):
  ```json
  {
    "error": {
      "message": "Client is already assigned to this coach",
      "code": "already_assigned"
    }
  }
  ```

  Client not in business (403):
  ```json
  {
    "error": {
      "message": "Client does not belong to the same business",
      "code": "forbidden"
    }
  }
  ```
  """
  def assign_client(conn, %{"id" => coach_id, "client_id" => client_id}) do
    scope = conn.assigns[:scope]

    case Coaches.assign_client(scope, coach_id, client_id) do
      {:ok, assignment} ->
        conn
        |> put_status(:created)
        |> json(%{
          assignment: format_assignment(assignment)
        })

      {:error, :coach_not_found} ->
        error = ApiError.not_found("Coach")
        render_error(conn, error)

      {:error, :client_not_found} ->
        error = ApiError.not_found("Client")
        render_error(conn, error)

      {:error, :forbidden} ->
        error =
          ApiError.forbidden("You do not have permission to manage this coach's assignments")

        render_error(conn, error)

      {:error, :different_business} ->
        error = ApiError.forbidden("Client does not belong to the same business")
        render_error(conn, error)

      {:error, %Ecto.Changeset{} = changeset} ->
        # Check if it's a unique constraint violation
        if has_unique_constraint_error?(changeset) do
          error = ApiError.from_code(:already_assigned, nil, nil)
          render_error(conn, error)
        else
          error = ApiError.validation_error(changeset)
          render_error(conn, error)
        end

      {:error, reason} ->
        error =
          ApiError.unprocessable_entity("Failed to assign client", %{reason: to_string(reason)})

        render_error(conn, error)
    end
  end

  @doc """
  DELETE /api/coaches/:id/clients/:client_id/unassign

  Removes a client assignment from a coach.

  ## Authorization
  User must belong to the same business as the coach and have permission to manage assignments.

  ## Response

  Success (200):
  ```json
  {
    "message": "Client successfully unassigned from coach"
  }
  ```

  ## Error Responses

  Not assigned (404):
  ```json
  {
    "error": {
      "message": "Client is not assigned to this coach",
      "code": "not_found"
    }
  }
  ```
  """
  def unassign_client(conn, %{"id" => coach_id, "client_id" => client_id}) do
    scope = conn.assigns[:scope]

    case Coaches.unassign_client(scope, coach_id, client_id) do
      {:ok, _assignment} ->
        conn
        |> json(%{
          message: "Client successfully unassigned from coach"
        })

      {:error, :coach_not_found} ->
        error = ApiError.not_found("Coach")
        render_error(conn, error)

      {:error, :client_not_found} ->
        error = ApiError.not_found("Client")
        render_error(conn, error)

      {:error, :forbidden} ->
        error =
          ApiError.forbidden("You do not have permission to manage this coach's assignments")

        render_error(conn, error)

      {:error, :not_found} ->
        error = ApiError.not_found("Assignment")
        error = %{error | message: "Client is not assigned to this coach"}
        render_error(conn, error)

      {:error, reason} ->
        error =
          ApiError.unprocessable_entity("Failed to unassign client", %{reason: to_string(reason)})

        render_error(conn, error)
    end
  end

  # ============================================
  # PRIVATE HELPERS
  # ============================================

  # Checks if changeset has unique constraint error
  defp has_unique_constraint_error?(changeset) do
    Enum.any?(changeset.errors, fn {_field, {_msg, opts}} ->
      Keyword.get(opts, :constraint) == :unique
    end)
  end

  # Formats coach for JSON response
  defp format_coach(coach), do: ResponseHelpers.format_coach(coach)

  # Formats client for JSON response
  defp format_client(client), do: ResponseHelpers.format_client(client)

  # Formats assignment for JSON response
  defp format_assignment(assignment), do: ResponseHelpers.format_assignment(assignment)

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

defmodule EasyWeb.CoachController do
  use EasyWeb, :controller

  alias Easy.{Coaches, Clients, Repo}

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
    user = conn.assigns.current_user

    case Coaches.get_coach_with_preloads(id, [:user, :business]) do
      nil ->
        conn
        |> put_status(:not_found)
        |> json(%{
          error: %{
            message: "Coach not found",
            code: "not_found",
            details: nil
          }
        })

      coach ->
        # Check if user belongs to the same business
        if user_can_access_coach?(user, coach) do
          conn
          |> json(%{
            coach: format_coach(coach)
          })
        else
          conn
          |> put_status(:forbidden)
          |> json(%{
            error: %{
              message: "You do not have permission to access this coach",
              code: "forbidden",
              details: nil
            }
          })
        end
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
    user = conn.assigns.current_user

    case Coaches.get_coach(id) do
      nil ->
        conn
        |> put_status(:not_found)
        |> json(%{
          error: %{
            message: "Coach not found",
            code: "not_found",
            details: nil
          }
        })

      coach ->
        # Check if user owns this coach profile
        if coach.user_id == user.id do
          # Extract update attributes
          attrs = Map.take(params, ["bio", "specialties", "credentials"])

          case Coaches.update_coach(coach, attrs) do
            {:ok, updated_coach} ->
              updated_coach = Repo.preload(updated_coach, [:user, :business])

              conn
              |> json(%{
                coach: format_coach(updated_coach)
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
              message: "You can only update your own coach profile",
              code: "forbidden",
              details: nil
            }
          })
        end
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
    user = conn.assigns.current_user

    case Coaches.get_coach_with_preloads(id, [:business]) do
      nil ->
        conn
        |> put_status(:not_found)
        |> json(%{
          error: %{
            message: "Coach not found",
            code: "not_found",
            details: nil
          }
        })

      coach ->
        # Check if user can access this coach
        if user_can_access_coach?(user, coach) do
          clients =
            Coaches.list_coach_clients(coach.id)
            |> Repo.preload(:user)

          conn
          |> json(%{
            clients: Enum.map(clients, &format_client/1)
          })
        else
          conn
          |> put_status(:forbidden)
          |> json(%{
            error: %{
              message: "You do not have permission to access this coach",
              code: "forbidden",
              details: nil
            }
          })
        end
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
    user = conn.assigns.current_user

    with {:ok, coach} <- get_coach_or_error(coach_id),
         {:ok, client} <- get_client_or_error(client_id),
         :ok <- authorize_coach_access(user, coach),
         :ok <- verify_same_business(coach, client),
         {:ok, assignment} <- Coaches.assign_client(coach.id, client.id) do
      conn
      |> put_status(:created)
      |> json(%{
        assignment: format_assignment(assignment)
      })
    else
      {:error, :coach_not_found} ->
        conn
        |> put_status(:not_found)
        |> json(%{
          error: %{
            message: "Coach not found",
            code: "not_found",
            details: nil
          }
        })

      {:error, :client_not_found} ->
        conn
        |> put_status(:not_found)
        |> json(%{
          error: %{
            message: "Client not found",
            code: "not_found",
            details: nil
          }
        })

      {:error, :forbidden} ->
        conn
        |> put_status(:forbidden)
        |> json(%{
          error: %{
            message: "You do not have permission to manage this coach's assignments",
            code: "forbidden",
            details: nil
          }
        })

      {:error, :different_business} ->
        conn
        |> put_status(:forbidden)
        |> json(%{
          error: %{
            message: "Client does not belong to the same business",
            code: "forbidden",
            details: nil
          }
        })

      {:error, %Ecto.Changeset{} = changeset} ->
        # Check if it's a unique constraint violation
        if has_unique_constraint_error?(changeset) do
          conn
          |> put_status(:unprocessable_entity)
          |> json(%{
            error: %{
              message: "Client is already assigned to this coach",
              code: "already_assigned",
              details: nil
            }
          })
        else
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
    user = conn.assigns.current_user

    with {:ok, coach} <- get_coach_or_error(coach_id),
         {:ok, _client} <- get_client_or_error(client_id),
         :ok <- authorize_coach_access(user, coach),
         {:ok, _assignment} <- Coaches.unassign_client(coach.id, client_id) do
      conn
      |> json(%{
        message: "Client successfully unassigned from coach"
      })
    else
      {:error, :coach_not_found} ->
        conn
        |> put_status(:not_found)
        |> json(%{
          error: %{
            message: "Coach not found",
            code: "not_found",
            details: nil
          }
        })

      {:error, :client_not_found} ->
        conn
        |> put_status(:not_found)
        |> json(%{
          error: %{
            message: "Client not found",
            code: "not_found",
            details: nil
          }
        })

      {:error, :forbidden} ->
        conn
        |> put_status(:forbidden)
        |> json(%{
          error: %{
            message: "You do not have permission to manage this coach's assignments",
            code: "forbidden",
            details: nil
          }
        })

      {:error, :not_found} ->
        conn
        |> put_status(:not_found)
        |> json(%{
          error: %{
            message: "Client is not assigned to this coach",
            code: "not_found",
            details: nil
          }
        })
    end
  end

  # ============================================
  # PRIVATE HELPERS
  # ============================================

  # Checks if user can access a coach (owns the profile or belongs to same business)
  defp user_can_access_coach?(user, coach) do
    import Ecto.Query

    # User owns the coach profile
    if coach.user_id == user.id do
      true
    else
      # User belongs to the same business (as owner or another coach)
      business_id = coach.business_id

      # Check if user is business owner
      owner_query =
        from b in Easy.Organizations.Business,
          where: b.id == ^business_id and b.owner_id == ^user.id,
          limit: 1

      if Repo.exists?(owner_query) do
        true
      else
        # Check if user is a coach in the same business
        coach_query =
          from c in Easy.Coaches.Coach,
            where: c.user_id == ^user.id and c.business_id == ^business_id,
            limit: 1

        Repo.exists?(coach_query)
      end
    end
  end

  # Gets coach or returns error tuple
  defp get_coach_or_error(coach_id) do
    case Coaches.get_coach_with_preloads(coach_id, [:business]) do
      nil -> {:error, :coach_not_found}
      coach -> {:ok, coach}
    end
  end

  # Gets client or returns error tuple
  defp get_client_or_error(client_id) do
    case Clients.get_client_with_preloads(client_id, [:business]) do
      nil -> {:error, :client_not_found}
      client -> {:ok, client}
    end
  end

  # Authorizes user access to coach
  defp authorize_coach_access(user, coach) do
    if user_can_access_coach?(user, coach) do
      :ok
    else
      {:error, :forbidden}
    end
  end

  # Verifies coach and client belong to same business
  defp verify_same_business(coach, client) do
    if coach.business_id == client.business_id do
      :ok
    else
      {:error, :different_business}
    end
  end

  # Checks if changeset has unique constraint error
  defp has_unique_constraint_error?(changeset) do
    Enum.any?(changeset.errors, fn {_field, {_msg, opts}} ->
      Keyword.get(opts, :constraint) == :unique
    end)
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

  # Formats assignment for JSON response
  defp format_assignment(assignment) do
    %{
      id: to_string(assignment.id),
      coach_id: to_string(assignment.coach_id),
      client_id: to_string(assignment.client_id),
      assigned_at: assignment.assigned_at
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

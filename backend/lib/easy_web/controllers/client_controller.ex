defmodule EasyWeb.ClientController do
  use EasyWeb, :controller

  alias Easy.{Clients, Coaches, Repo, ApiError}
  alias EasyWeb.ResponseHelpers

  action_fallback EasyWeb.FallbackController

  @moduledoc """
  Client controller for managing client resources and invitations.

  Handles:
  - POST /api/clients/invite - Create client invitation (coach authorization)
  - GET /api/invitations/:token - Validate invitation token (public)
  - POST /api/invitations/:token/accept - Accept invitation and send OTP (public)
  """

  @doc """
  POST /api/clients/invite

  Creates a client invitation. The coach invites a client to join their business.

  ## Authorization
  User must be a coach in a business.

  ## Parameters
  - email: Client's email address (required)
  - full_name: Client's full name (required)
  - phone: Client's phone number (optional)
  - notes: Notes about the client (optional)

  ## Response

  Success (201):
  ```json
  {
    "client": {
      "id": "202",
      "email": "client@example.com",
      "full_name": "Jane Client",
      "phone": "+1234567890",
      "status": "pending",
      "business_id": "456"
    },
    "invitation": {
      "token_id": "550e8400-e29b-41d4-a716-446655440000",
      "invitation_url": "https://app.example.com/invite/550e8400-...",
      "expires_at": "2024-01-08T12:00:00Z"
    }
  }
  ```

  ## Error Responses

  Validation error (422):
  ```json
  {
    "error": {
      "message": "Validation failed",
      "code": "validation_error",
      "details": {
        "email": ["has already been taken"]
      }
    }
  }
  ```

  Forbidden (403):
  ```json
  {
    "error": {
      "message": "You must be a coach to invite clients",
      "code": "forbidden"
    }
  }
  ```

  Rate limit (429):
  ```json
  {
    "error": {
      "message": "Too many invitation requests. Please try again later.",
      "code": "rate_limit_exceeded",
      "details": {
        "retry_after": 300
      }
    }
  }
  ```
  """
  def invite(conn, params) do
    user = conn.assigns.current_user

    # Get the coach profile for the current user
    # For MVP, we'll use the first coach profile found
    # In the future, this should be specified by business_id parameter
    coach = get_user_coach(user.id)

    case coach do
      nil ->
        error = ApiError.forbidden("You must be a coach to invite clients")
        render_error(conn, error)

      coach ->
        # Extract invitation attributes
        attrs = %{
          "email" => params["email"],
          "full_name" => params["full_name"],
          "phone" => params["phone"],
          "notes" => params["notes"]
        }

        case Clients.create_invitation(coach, attrs) do
          {:ok, %{client: client, invitation_token: token_uuid, expires_at: expires_at}} ->
            # Build invitation URL
            invitation_url = build_invitation_url(conn, token_uuid)

            conn
            |> put_status(:created)
            |> json(%{
              client: format_client(client),
              invitation:
                ResponseHelpers.format_invitation_response(token_uuid, invitation_url, expires_at)
            })

          {:error, :rate_limited, retry_after} ->
            error =
              ApiError.from_code(:rate_limit_exceeded, retry_after, %{retry_after: retry_after})

            render_error(conn, error)

          {:error, changeset} ->
            error = ApiError.validation_error(changeset)
            render_error(conn, error)
        end
    end
  end

  @doc """
  GET /api/invitations/:token_id

  Validates an invitation token and returns invitation details.
  This is a public endpoint (no authentication required).

  ## Parameters
  - token_id: The invitation token UUID (in URL path)

  ## Response

  Success (200):
  ```json
  {
    "invitation": {
      "token_id": "550e8400-e29b-41d4-a716-446655440000",
      "status": "valid",
      "expires_at": "2024-01-08T12:00:00Z"
    },
    "client": {
      "email": "client@example.com",
      "full_name": "Jane Client"
    },
    "business": {
      "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
      "name": "Coaching Pro"
    },
    "inviting_coach": {
      "full_name": "John Coach"
    }
  }
  ```

  ## Error Responses

  Invalid token (404):
  ```json
  {
    "error": {
      "message": "Invitation not found or invalid",
      "code": "not_found"
    }
  }
  ```

  Token expired (410):
  ```json
  {
    "error": {
      "message": "This invitation has expired",
      "code": "invitation_expired"
    }
  }
  ```

  Token used (410):
  ```json
  {
    "error": {
      "message": "This invitation has already been used",
      "code": "invitation_used"
    }
  }
  ```
  """
  def show_invitation(conn, %{"token_id" => token_id}) do
    case Clients.get_invitation(token_id) do
      {:ok, %{token: token, client: client}} ->
        # Preload business and get inviting coach info
        client = Repo.preload(client, [:business])

        # Get inviting coach from token metadata
        inviting_coach = get_inviting_coach(token_id)

        conn
        |> json(%{
          invitation: %{
            token_id: token_id,
            status: "valid",
            expires_at: DateTime.to_iso8601(token.expires_at)
          },
          client: %{
            email: client.email,
            full_name: client.full_name
          },
          business: %{
            id: to_string(client.business_id),
            name: client.business.name
          },
          inviting_coach:
            if(inviting_coach, do: %{full_name: inviting_coach.user.full_name}, else: nil)
        })

      {:error, :invalid_token} ->
        error = ApiError.not_found("Invitation")
        error = %{error | message: "Invitation not found or invalid"}
        render_error(conn, error)

      {:error, :token_expired} ->
        error = ApiError.from_code(:invitation_expired, nil, nil)
        render_error(conn, error)

      {:error, :token_used} ->
        error = ApiError.from_code(:invitation_used, nil, nil)
        render_error(conn, error)

      {:error, :metadata_validation_failed, reason} ->
        error = ApiError.from_code(:metadata_validation_failed, reason, %{reason: reason})
        render_error(conn, error)
    end
  end

  @doc """
  POST /api/invitations/:token_id/accept

  Accepts an invitation and completes client registration with OTP verification.
  This combines the previous "accept" and "complete" steps into a single endpoint.
  This is a public endpoint (no authentication required).

  ## Parameters
  - token_id: The invitation token UUID (in URL path)
  - code: The 6-digit OTP code sent to the client's email (in request body)

  ## Response

  Success (200):
  ```json
  {
    "user": {
      "id": "b8c9d0e1-f2a3-4567-1234-567890123456",
      "email": "client@example.com",
      "full_name": "Jane Client",
      "email_verified": true,
      "roles": ["client"],
      "client_profile": {
        "id": "f6a7b8c9-d0e1-2345-f012-345678901234",
        "business_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
        "status": "active",
        "assigned_coaches": [
          {
            "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
            "user": {
              "full_name": "John Coach"
            }
          }
        ]
      }
    },
    "session": {
      "access_token": "eyJhbGc...",
      "refresh_token": "eyJhbGc...",
      "expires_at": "2024-01-08T12:00:00Z",
      "expires_in": 604800
    }
  }
  ```

  ## Error Responses

  Invalid token (404):
  ```json
  {
    "error": {
      "message": "Invitation not found or invalid",
      "code": "not_found"
    }
  }
  ```

  Token expired (410):
  ```json
  {
    "error": {
      "message": "This invitation has expired",
      "code": "invitation_expired"
    }
  }
  ```

  Invalid OTP (400):
  ```json
  {
    "error": {
      "message": "The provided code is invalid or has expired",
      "code": "invalid_otp",
      "details": {
        "attempts_remaining": 2
      }
    }
  }
  ```
  """
  def accept_invitation(conn, %{"token_id" => token_id, "code" => code}) do
    case Clients.complete_client_registration(token_id, code) do
      {:ok, %{user: user, client: client, session: session_data}} ->
        # Preload assigned coaches for the response
        client = Repo.preload(client, coaches: [:user])

        # Build user response with client profile
        user_response = %{
          id: to_string(user.id),
          email: user.email,
          full_name: user.full_name,
          email_verified: user.email_verified,
          roles: ["client"],
          client_profile: %{
            id: to_string(client.id),
            business_id: to_string(client.business_id),
            status: client.status,
            assigned_coaches:
              Enum.map(client.coaches, fn coach ->
                %{
                  id: to_string(coach.id),
                  user: %{
                    full_name: coach.user.full_name
                  }
                }
              end)
          }
        }

        # Build session response
        session_section =
          cond do
            is_map(session_data[:session]) -> session_data[:session]
            is_map(session_data["session"]) -> session_data["session"]
            true -> session_data
          end

        {session_id, session_expires_at, access_token, refresh_token, expires_in} =
          cond do
            match?(%{session: %_{}}, session_section) ->
              %{
                session: %_{} = session,
                access_token: access_token,
                refresh_token: refresh_token,
                expires_in: expires_in
              } = session_section

              {session.id, session.expires_at, access_token, refresh_token, expires_in}

            match?(%{"session" => %{}}, session_section) ->
              %{
                "session" => session,
                "access_token" => access_token,
                "refresh_token" => refresh_token,
                "expires_in" => expires_in
              } = session_section

              session_id = session["id"] || session[:id]
              session_expires_at = session["expires_at"] || session[:expires_at]

              {session_id, session_expires_at, access_token, refresh_token, expires_in}

            true ->
              raise ArgumentError, "invalid session data structure"
          end

        expires_at_iso =
          cond do
            match?(%DateTime{}, session_expires_at) ->
              DateTime.to_iso8601(session_expires_at)

            match?(%NaiveDateTime{}, session_expires_at) ->
              session_expires_at
              |> DateTime.from_naive!("Etc/UTC")
              |> DateTime.to_iso8601()

            is_binary(session_expires_at) ->
              session_expires_at

            true ->
              nil
          end

        session_response = %{
          session_id: to_string(session_id),
          access_token: access_token,
          refresh_token: refresh_token,
          expires_at: expires_at_iso,
          expires_in: expires_in
        }

        conn
        |> json(%{
          user: user_response,
          session: session_response
        })

      {:error, :invalid_token} ->
        error = ApiError.not_found("Invitation")
        error = %{error | message: "Invitation not found or invalid"}
        render_error(conn, error)

      {:error, :token_expired} ->
        error = ApiError.from_code(:invitation_expired, nil, nil)
        render_error(conn, error)

      {:error, :token_used} ->
        error = ApiError.from_code(:invitation_used, nil, nil)
        render_error(conn, error)

      {:error, :invalid_otp} ->
        error = ApiError.from_code(:invalid_otp, nil, nil)
        render_error(conn, error)

      {:error, :max_attempts} ->
        error = ApiError.from_code(:max_attempts_exceeded, nil, nil)
        render_error(conn, error)

      {:error, :metadata_validation_failed, reason} ->
        error = ApiError.from_code(:metadata_validation_failed, reason, %{reason: reason})
        render_error(conn, error)

      {:error, _reason} ->
        error = ApiError.from_code(:internal_error, nil, nil)
        render_error(conn, error)
    end
  end

  @doc """
  GET /api/clients/:id

  Retrieves client details.

  ## Authorization
  User must be a coach in the same business as the client, or the client themselves.

  ## Response

  Success (200):
  ```json
  {
    "client": {
      "id": "202",
      "email": "client@example.com",
      "full_name": "Jane Client",
      "phone": "+1234567890",
      "status": "active",
      "business_id": "456",
      "notes": "Some notes",
      "user_id": "303"
    }
  }
  ```

  ## Error Responses

  Not found (404):
  ```json
  {
    "error": {
      "message": "Client not found",
      "code": "not_found"
    }
  }
  ```

  Forbidden (403):
  ```json
  {
    "error": {
      "message": "You do not have permission to access this client",
      "code": "forbidden"
    }
  }
  ```
  """
  def show(conn, %{"id" => id}) do
    user = conn.assigns.current_user

    case Clients.get_client_with_preloads(id, [:user, :business]) do
      nil ->
        error = ApiError.not_found("Client")
        render_error(conn, error)

      client ->
        # Check if user can access this client
        if user_can_access_client?(user, client) do
          conn
          |> json(%{client: format_client(client)})
        else
          error = ApiError.forbidden("You do not have permission to access this client")
          render_error(conn, error)
        end
    end
  end

  @doc """
  PATCH /api/clients/:id

  Updates client information.

  ## Authorization
  User must be a coach in the same business as the client.

  ## Parameters
  - full_name: Client's full name (optional)
  - phone: Client's phone number (optional)
  - notes: Notes about the client (optional)

  ## Response

  Success (200):
  ```json
  {
    "client": {
      "id": "202",
      "email": "client@example.com",
      "full_name": "Updated Name",
      "phone": "+1234567890",
      "status": "active",
      "business_id": "456",
      "notes": "Updated notes"
    }
  }
  ```

  ## Error Responses

  Forbidden (403):
  ```json
  {
    "error": {
      "message": "You do not have permission to update this client",
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
        "phone": ["is invalid"]
      }
    }
  }
  ```
  """
  def update(conn, %{"id" => id} = params) do
    user = conn.assigns.current_user

    case Clients.get_client_with_preloads(id, [:business]) do
      nil ->
        error = ApiError.not_found("Client")
        render_error(conn, error)

      client ->
        # Check if user is a coach in the same business
        if user_is_coach_in_business?(user, client.business_id) do
          # Extract update attributes (email cannot be updated)
          attrs = Map.take(params, ["full_name", "phone", "notes"])

          case Clients.update_client(client, attrs) do
            {:ok, updated_client} ->
              updated_client = Repo.preload(updated_client, [:user, :business])

              conn
              |> json(%{client: format_client(updated_client)})

            {:error, changeset} ->
              error = ApiError.validation_error(changeset)
              render_error(conn, error)
          end
        else
          error = ApiError.forbidden("You do not have permission to update this client")
          render_error(conn, error)
        end
    end
  end

  @doc """
  GET /api/clients

  Lists clients with pagination and filtering.

  ## Authorization
  User must be a coach. Returns clients from the coach's business.

  ## Query Parameters
  - limit: Number of results per page (default: 50, max: 100)
  - offset: Number of results to skip (default: 0)
  - status: Filter by client status (optional)
  - business_id: Filter by business ID (optional, defaults to user's first coach business)

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

  ## Error Responses

  Forbidden (403):
  ```json
  {
    "error": {
      "message": "You must be a coach to list clients",
      "code": "forbidden"
    }
  }
  ```
  """
  def index(conn, params) do
    user = conn.assigns.current_user

    # Get the coach profile for the current user
    # For MVP, we'll use the first coach profile found
    # In the future, business_id should be required parameter
    coach = get_user_coach(user.id)

    case coach do
      nil ->
        error = ApiError.forbidden("You must be a coach to list clients")
        render_error(conn, error)

      coach ->
        # Parse pagination parameters
        limit = parse_limit(params["limit"])
        offset = parse_offset(params["offset"])
        status = params["status"]

        # Build options
        opts = [limit: limit, offset: offset]
        opts = if status, do: Keyword.put(opts, :status, status), else: opts

        # Get clients for the coach's business
        clients =
          Clients.list_clients(coach.business_id, opts)
          |> Repo.preload(:user)

        # Get total count for pagination
        total = count_business_clients(coach.business_id, status)

        conn
        |> json(%{
          clients: Enum.map(clients, &format_client/1),
          pagination: %{
            limit: limit,
            offset: offset,
            total: total
          }
        })
    end
  end

  @doc """
  GET /api/clients/:id/coaches

  Lists all coaches assigned to a client.

  ## Authorization
  User must be a coach in the same business as the client, or the client themselves.

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
        "specialties": ["life coaching"],
        "user": {
          "id": "123",
          "email": "coach@example.com",
          "full_name": "John Coach"
        }
      }
    ]
  }
  ```
  """
  def list_coaches(conn, %{"id" => id}) do
    user = conn.assigns.current_user

    case Clients.get_client_with_preloads(id, [:business]) do
      nil ->
        error = ApiError.not_found("Client")
        render_error(conn, error)

      client ->
        # Check if user can access this client
        if user_can_access_client?(user, client) do
          coaches =
            Clients.list_client_coaches(client.id)
            |> Repo.preload(:user)

          conn
          |> json(%{coaches: Enum.map(coaches, &format_coach/1)})
        else
          error = ApiError.forbidden("You do not have permission to access this client")
          render_error(conn, error)
        end
    end
  end

  @doc """
  PATCH /api/clients/:id/status

  Updates a client's status.

  ## Authorization
  User must be a coach in the same business as the client.

  ## Parameters
  - status: The new status ("pending", "active", "inactive", "archived")

  ## Response

  Success (200):
  ```json
  {
    "client": {
      "id": "202",
      "email": "client@example.com",
      "full_name": "Jane Client",
      "status": "inactive",
      "business_id": "456"
    }
  }
  ```

  ## Error Responses

  Validation error (422):
  ```json
  {
    "error": {
      "message": "Validation failed",
      "code": "validation_error",
      "details": {
        "status": ["is invalid"]
      }
    }
  }
  ```
  """
  def update_status(conn, %{"id" => id, "status" => status}) do
    user = conn.assigns.current_user

    case Clients.get_client_with_preloads(id, [:business]) do
      nil ->
        error = ApiError.not_found("Client")
        render_error(conn, error)

      client ->
        # Check if user is a coach in the same business
        if user_is_coach_in_business?(user, client.business_id) do
          case Clients.update_client_status(client, status) do
            {:ok, updated_client} ->
              updated_client = Repo.preload(updated_client, [:user, :business])

              conn
              |> json(%{client: format_client(updated_client)})

            {:error, changeset} ->
              error = ApiError.validation_error(changeset)
              render_error(conn, error)
          end
        else
          error = ApiError.forbidden("You do not have permission to update this client")
          render_error(conn, error)
        end
    end
  end

  # ============================================
  # PRIVATE HELPERS
  # ============================================

  # Gets the first coach profile for a user
  # In the future, this should accept a business_id parameter
  defp get_user_coach(user_id) do
    import Ecto.Query

    from(c in Easy.Coaches.Coach,
      where: c.user_id == ^user_id,
      limit: 1
    )
    |> Repo.one()
  end

  # Gets the inviting coach from the invitation token
  defp get_inviting_coach(token_uuid) do
    import Ecto.Query

    # Get the token to access metadata
    token =
      from(t in Easy.Accounts.OneTimeToken,
        where: t.token == ^token_uuid,
        limit: 1
      )
      |> Repo.one()

    if token && token.metadata["inviting_coach_id"] do
      Coaches.get_coach_with_preloads(token.metadata["inviting_coach_id"], [:user])
    else
      nil
    end
  end

  # Builds the invitation URL
  defp build_invitation_url(conn, token_uuid) do
    # For now, we'll use a placeholder URL
    # In production, this should use the actual frontend URL from config
    base_url = get_base_url(conn)
    "#{base_url}/invite/#{token_uuid}"
  end

  # Gets the base URL for the application
  defp get_base_url(conn) do
    scheme = conn.scheme |> to_string()
    host = conn.host
    port = conn.port

    # Don't include port for standard ports
    port_string =
      case {scheme, port} do
        {"http", 80} -> ""
        {"https", 443} -> ""
        _ -> ":#{port}"
      end

    "#{scheme}://#{host}#{port_string}"
  end

  # Checks if user can access a client (is a coach in same business or is the client)
  defp user_can_access_client?(user, client) do
    import Ecto.Query

    # User is the client
    if client.user_id == user.id do
      true
    else
      # User is a coach in the same business
      user_is_coach_in_business?(user, client.business_id)
    end
  end

  # Checks if user is a coach in a specific business
  defp user_is_coach_in_business?(user, business_id) do
    import Ecto.Query

    query =
      from c in Easy.Coaches.Coach,
        where: c.user_id == ^user.id and c.business_id == ^business_id,
        limit: 1

    Repo.exists?(query)
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

  # Formats client for JSON response
  defp format_client(client), do: ResponseHelpers.format_client(client)

  # Formats coach for JSON response
  defp format_coach(coach), do: ResponseHelpers.format_coach(coach)

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

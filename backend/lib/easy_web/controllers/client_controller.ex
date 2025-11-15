defmodule EasyWeb.ClientController do
  use EasyWeb, :controller

  alias Easy.{Clients, Coaches, ApiError}
  alias EasyWeb.ResponseHelpers

  def invite(conn, params) do
    scope = conn.assigns[:scope]

    # Extract invitation attributes
    attrs = %{
      "email" => params["email"],
      "full_name" => params["full_name"],
      "phone" => params["phone"],
      "notes" => params["notes"]
    }

    case Clients.invite_client(scope, attrs) do
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

      {:error, :forbidden} ->
        error = ApiError.forbidden("You must be a coach to invite clients")
        render_error(conn, error)

      {:error, :rate_limited, retry_after} ->
        error =
          ApiError.from_code(:rate_limit_exceeded, retry_after, %{retry_after: retry_after})

        render_error(conn, error)

      {:error, %Ecto.Changeset{} = changeset} ->
        error = ApiError.validation_error(changeset)
        render_error(conn, error)

      {:error, reason} ->
        error =
          ApiError.unprocessable_entity("Failed to create invitation", %{
            reason: to_string(reason)
          })

        render_error(conn, error)
    end
  end

  def show_invitation(conn, %{"token_id" => token_id}) do
    case Clients.get_invitation(token_id) do
      {:ok, %{token: token, client: client}} ->
        # Preload business and get inviting coach info
        client = Easy.Repo.preload(client, [:business])

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

  def accept_invitation(conn, %{"token_id" => token_id, "code" => code}) do
    case Clients.complete_client_registration(token_id, code) do
      {:ok, %{user: user, client: client, session: session_data}} ->
        # Preload assigned coaches for the response
        client = Easy.Repo.preload(client, coaches: [:user])

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

  def show(conn, %{"id" => id}) do
    scope = conn.assigns[:scope]

    case Clients.get_client(scope, id) do
      {:ok, client} ->
        conn
        |> json(%{client: format_client(client)})

      {:error, :not_found} ->
        error = ApiError.not_found("Client")
        render_error(conn, error)

      {:error, :forbidden} ->
        error = ApiError.forbidden("You do not have permission to access this client")
        render_error(conn, error)
    end
  end

  def update(conn, %{"id" => id} = params) do
    scope = conn.assigns[:scope]

    # Extract update attributes (email cannot be updated)
    attrs = Map.take(params, ["full_name", "phone", "notes"])

    case Clients.update_client(scope, id, attrs) do
      {:ok, updated_client} ->
        conn
        |> json(%{client: format_client(updated_client)})

      {:error, :not_found} ->
        error = ApiError.not_found("Client")
        render_error(conn, error)

      {:error, :forbidden} ->
        error = ApiError.forbidden("You do not have permission to update this client")
        render_error(conn, error)

      {:error, %Ecto.Changeset{} = changeset} ->
        error = ApiError.validation_error(changeset)
        render_error(conn, error)

      {:error, reason} ->
        error =
          ApiError.unprocessable_entity("Failed to update client", %{reason: to_string(reason)})

        render_error(conn, error)
    end
  end

  def index(conn, params) do
    scope = conn.assigns[:scope]

    # Parse pagination parameters
    limit = parse_limit(params["limit"])
    offset = parse_offset(params["offset"])
    status = params["status"]

    # Build options
    opts = [limit: limit, offset: offset]
    opts = if status, do: Keyword.put(opts, :status, status), else: opts

    case Clients.list_clients(scope, opts) do
      {:ok, clients, total} ->
        conn
        |> json(%{
          clients: Enum.map(clients, &format_client/1),
          pagination: %{
            limit: limit,
            offset: offset,
            total: total
          }
        })

      {:error, :forbidden} ->
        error = ApiError.forbidden("You must be a coach to list clients")
        render_error(conn, error)

      {:error, reason} ->
        error =
          ApiError.unprocessable_entity("Failed to list clients", %{reason: to_string(reason)})

        render_error(conn, error)
    end
  end

  def list_coaches(conn, %{"id" => id}) do
    scope = conn.assigns[:scope]

    case Clients.list_client_coaches(scope, id) do
      {:ok, coaches} ->
        conn
        |> json(%{coaches: Enum.map(coaches, &format_coach/1)})

      {:error, :not_found} ->
        error = ApiError.not_found("Client")
        render_error(conn, error)

      {:error, :forbidden} ->
        error = ApiError.forbidden("You do not have permission to access this client")
        render_error(conn, error)

      {:error, reason} ->
        error =
          ApiError.unprocessable_entity("Failed to list coaches", %{reason: to_string(reason)})

        render_error(conn, error)
    end
  end

  def update_status(conn, %{"id" => id, "status" => status}) do
    scope = conn.assigns[:scope]

    case Clients.update_client_status(scope, id, status) do
      {:ok, updated_client} ->
        conn
        |> json(%{client: format_client(updated_client)})

      {:error, :not_found} ->
        error = ApiError.not_found("Client")
        render_error(conn, error)

      {:error, :forbidden} ->
        error = ApiError.forbidden("You do not have permission to update this client")
        render_error(conn, error)

      {:error, %Ecto.Changeset{} = changeset} ->
        error = ApiError.validation_error(changeset)
        render_error(conn, error)

      {:error, reason} ->
        error =
          ApiError.unprocessable_entity("Failed to update client status", %{
            reason: to_string(reason)
          })

        render_error(conn, error)
    end
  end

  # ============================================
  # PRIVATE HELPERS
  # ============================================

  # Gets the inviting coach from the invitation token
  defp get_inviting_coach(token_uuid) do
    import Ecto.Query

    # Get the token to access metadata
    token =
      from(t in Easy.Accounts.OneTimeToken,
        where: t.token == ^token_uuid,
        limit: 1
      )
      |> Easy.Repo.one()

    if token && token.metadata["inviting_coach_id"] do
      Coaches.get_coach_with_preloads(token.metadata["inviting_coach_id"], [:user])
    else
      nil
    end
  end

  defp build_invitation_url(conn, token_uuid) do
    # For now, we'll use a placeholder URL
    # In production, this should use the actual frontend URL from config
    base_url = get_base_url(conn)
    "#{base_url}/invite/#{token_uuid}"
  end

  defp get_base_url(conn) do
    scheme = conn.scheme |> to_string()
    host = conn.host
    port = conn.port

    port_string =
      case {scheme, port} do
        {"http", 80} -> ""
        {"https", 443} -> ""
        _ -> ":#{port}"
      end

    "#{scheme}://#{host}#{port_string}"
  end

  defp parse_limit(nil), do: 50

  defp parse_limit(limit) when is_binary(limit) do
    case Integer.parse(limit) do
      {num, _} when num > 0 and num <= 100 -> num
      _ -> 50
    end
  end

  defp parse_limit(limit) when is_integer(limit) and limit > 0 and limit <= 100, do: limit
  defp parse_limit(_), do: 50

  defp parse_offset(nil), do: 0

  defp parse_offset(offset) when is_binary(offset) do
    case Integer.parse(offset) do
      {num, _} when num >= 0 -> num
      _ -> 0
    end
  end

  defp parse_offset(offset) when is_integer(offset) and offset >= 0, do: offset
  defp parse_offset(_), do: 0

  defp format_client(client), do: ResponseHelpers.format_client(client)

  defp format_coach(coach), do: ResponseHelpers.format_coach(coach)

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

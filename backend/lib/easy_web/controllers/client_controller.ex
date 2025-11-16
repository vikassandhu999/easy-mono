defmodule EasyWeb.ClientController do
  use EasyWeb, :controller

  alias EasyWeb.ResponseHelpers
  alias Easy.Clients.Client
  alias Easy.Clients

  def invite(conn, params) do
    scope = conn.assigns[:scope]

    attrs = %{
      "email" => params["email"],
      "full_name" => params["full_name"],
      "phone" => params["phone"],
      "notes" => params["notes"]
    }

    with {:ok, %{client: client, invitation_token: token_uuid, expires_at: expires_at}} <-
           Clients.invite_client(scope, attrs) do
      invitation_url = build_invitation_url(conn, token_uuid)

      conn
      |> put_status(:created)
      |> render(:invite,
        client: client,
        invitation:
          ResponseHelpers.format_invitation_response(token_uuid, invitation_url, expires_at)
      )
    end
  end

  def show_invitation(conn, %{"token_id" => token_id}) do
    with {:ok, %{token: token, client: client}} <- Clients.get_invitation(token_id),
         %Client{} = client = Easy.Repo.preload(client, [:business]) do
      conn
      |> put_status(:ok)
      |> render(:show_invitation,
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
        }
      )
    end
  end

  def accept_invitation(conn, %{"token_id" => token_id, "code" => code}) do
    with {{:ok, %{user: user, client: client, session: session_data}}} <-
           Clients.complete_client_registration(token_id, code),
         %Client{} = client <- Easy.Repo.preload(client, coaches: [:user]) do
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
      |> put_status(:ok)
      |> render(:accept_invitation, user: user_response, session: session_response)
    end
  end

  def show(conn, %{"id" => id}) do
    scope = conn.assigns[:scope]

    with {:ok, client} <- Clients.get_client(scope, id) do
      conn
      |> put_status(:ok)
      |> render(:show, client: client)
    end
  end

  def update(conn, %{"id" => id} = params) do
    scope = conn.assigns[:scope]
    attrs = Map.take(params, ["full_name", "phone", "notes"])

    with {:ok, updated_client} <- Clients.update_client(scope, id, attrs) do
      conn
      |> put_status(:ok)
      |> render(:update, client: updated_client)
    end
  end

  def index(conn, params) do
    scope = conn.assigns[:scope]
    limit = parse_limit(params["limit"])
    offset = parse_offset(params["offset"])
    status = params["status"]

    opts = [limit: limit, offset: offset]
    opts = if status, do: Keyword.put(opts, :status, status), else: opts

    with {:ok, clients, total} <- Clients.list_clients(scope, opts) do
      conn
      |> put_status(:ok)
      |> render(:index,
        clients: clients,
        pagination: ResponseHelpers.format_pagination(limit, offset, total)
      )
    end
  end

  def update_status(conn, %{"id" => id, "status" => status}) do
    scope = conn.assigns[:scope]

    with {:ok, updated_client} <- Clients.update_client_status(scope, id, status) do
      conn
      |> put_status(:ok)
      |> render(:update_status, client: updated_client)
    end
  end

  defp build_invitation_url(conn, token_uuid) do
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
end

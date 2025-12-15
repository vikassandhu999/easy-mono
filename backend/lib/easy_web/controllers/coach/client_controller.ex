defmodule EasyWeb.Coach.ClientController do
  use EasyWeb, :controller

  alias Easy.Clients
  alias Easy.Auth.Scope

  def index(conn, params) do
    scope = conn.assigns.scope

    opts = [
      status: params["status"],
      search: params["search"],
      limit: parse_limit(params["limit"]),
      offset: parse_offset(params["offset"])
    ]

    with {:ok, clients, total} <- Clients.list_clients(scope, opts) do
      render(conn, :index, clients: clients, total: total, opts: opts)
    end
  end

  def invite(conn, params) do
    scope = conn.assigns.scope

    unless Scope.can?(scope, :create_client) do
      {:error,
       Easy.Error.new(
         :subscription_limit_reached,
         "Your subscription plan has reached the maximum number of clients. Please upgrade to invite more clients.",
         %{action: "create_client", subscription_status: Scope.subscription_status(scope)},
         :payment_required
       )}
    else
      attrs = Map.take(params, ["email", "full_name", "phone", "notes"])

      with {:ok, client} <- Clients.invite_client(scope, attrs) do
        invitation_url = build_invitation_url(conn, client.invitation_token)

        conn
        |> put_status(:created)
        |> render(:invite,
          client: client,
          invitation_token: client.invitation_token,
          invitation_url: invitation_url,
          expires_at: client.invitation_expires_at
        )
      end
    end
  end

  def show(conn, %{"id" => id}) do
    scope = conn.assigns.scope

    with {:ok, client} <- Clients.get_client(scope, id) do
      render(conn, :show, client: client)
    end
  end

  def update(conn, %{"id" => id} = params) do
    scope = conn.assigns.scope
    attrs = Map.take(params, ["full_name", "phone", "notes", "status"])

    with {:ok, client} <- Clients.update_client(scope, id, attrs) do
      render(conn, :show, client: client)
    end
  end

  def update_status(conn, %{"id" => id, "status" => status}) do
    scope = conn.assigns.scope

    with {:ok, client} <- Clients.update_client_status(scope, id, status) do
      render(conn, :show, client: client)
    end
  end

  def update_status(_conn, %{"id" => _id}) do
    {:error, Easy.Error.unprocessable("status is required")}
  end

  def resend_invitation(conn, %{"id" => id}) do
    scope = conn.assigns.scope

    with {:ok, client} <- Clients.resend_invitation(scope, id) do
      render(conn, :show, client: client)
    end
  end

  def delete(conn, %{"id" => id}) do
    scope = conn.assigns.scope

    with {:ok, client} <- Clients.archive_client(scope, id) do
      render(conn, :show, client: client)
    end
  end

  defp build_invitation_url(conn, token) do
    base_url =
      Application.get_env(:easy, :frontend_url) ||
        "#{conn.scheme}://#{conn.host}:#{conn.port}"

    "#{base_url}/invite/#{token}"
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

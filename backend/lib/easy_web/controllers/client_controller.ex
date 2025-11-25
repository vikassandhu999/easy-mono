defmodule EasyWeb.ClientController do
  @moduledoc """
  Handles client management endpoints for coaches.

  All endpoints require authentication and coach role.

  ## Endpoints (Coach Actions)
  - GET /api/clients - List clients in business
  - POST /api/clients/invite - Invite a new client
  - GET /api/clients/:id - Get client details
  - PATCH /api/clients/:id - Update client
  - PATCH /api/clients/:id/status - Update client status
  - POST /api/clients/:id/resend-invitation - Resend invitation email
  - DELETE /api/clients/:id - Archive client
  """

  use EasyWeb, :controller

  alias Easy.Clients
  alias Easy.Auth.Scope

  @doc """
  GET /api/clients

  Lists clients for the current business with optional filters.

  ## Query Parameters
  - `status` - Filter by status (pending, active, inactive, archived)
  - `search` - Search by name or email
  - `limit` - Results per page (default: 50, max: 100)
  - `offset` - Pagination offset (default: 0)
  """
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

  @doc """
  POST /api/clients/invite

  Creates a new client invitation. Sends invitation email with OTP.

  ## Request Body
  - `email` (required) - Client email
  - `full_name` (required) - Client full name
  - `phone` (optional) - Client phone number
  - `notes` (optional) - Coach notes about client
  """
  def invite(conn, params) do
    scope = conn.assigns.scope

    # Check subscription limits
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

      with {:ok, result} <- Clients.invite_client(scope, attrs) do
        invitation_url = build_invitation_url(conn, result.invitation_token)

        conn
        |> put_status(:created)
        |> render(:invite,
          client: result.client,
          invitation_token: result.invitation_token,
          invitation_url: invitation_url,
          expires_at: result.expires_at
        )
      end
    end
  end

  @doc """
  GET /api/clients/:id

  Gets a specific client's details.
  """
  def show(conn, %{"id" => id}) do
    scope = conn.assigns.scope

    with {:ok, client} <- Clients.get_client(scope, id) do
      render(conn, :show, client: client)
    end
  end

  @doc """
  PATCH /api/clients/:id

  Updates a client's details (coach action).

  ## Request Body
  - `full_name` - Client full name
  - `phone` - Client phone number
  - `notes` - Coach notes
  - `status` - Client status
  """
  def update(conn, %{"id" => id} = params) do
    scope = conn.assigns.scope
    attrs = Map.take(params, ["full_name", "phone", "notes", "status"])

    with {:ok, client} <- Clients.update_client(scope, id, attrs) do
      render(conn, :show, client: client)
    end
  end

  @doc """
  PATCH /api/clients/:id/status

  Updates a client's status.

  ## Request Body
  - `status` (required) - New status (pending, active, inactive, archived)
  """
  def update_status(conn, %{"id" => id, "status" => status}) do
    scope = conn.assigns.scope

    with {:ok, client} <- Clients.update_client_status(scope, id, status) do
      render(conn, :show, client: client)
    end
  end

  def update_status(_conn, %{"id" => _id}) do
    {:error, Easy.Error.unprocessable("status is required")}
  end

  @doc """
  POST /api/clients/:id/resend-invitation

  Resends the invitation email for a pending client.
  """
  def resend_invitation(conn, %{"id" => id}) do
    scope = conn.assigns.scope

    with {:ok, client} <- Clients.resend_invitation(scope, id) do
      render(conn, :show, client: client)
    end
  end

  @doc """
  DELETE /api/clients/:id

  Archives a client (soft delete).
  """
  def delete(conn, %{"id" => id}) do
    scope = conn.assigns.scope

    with {:ok, client} <- Clients.archive_client(scope, id) do
      render(conn, :show, client: client)
    end
  end

  # ===========================================================================
  # Private Helpers
  # ===========================================================================

  defp build_invitation_url(conn, token_id) do
    # In production, this should use a configured frontend URL
    base_url =
      Application.get_env(:easy, :frontend_url) ||
        "#{conn.scheme}://#{conn.host}:#{conn.port}"

    "#{base_url}/invite/#{token_id}"
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

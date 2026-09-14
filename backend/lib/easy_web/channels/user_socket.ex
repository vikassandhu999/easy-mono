defmodule EasyWeb.UserSocket do
  use Phoenix.Socket

  alias Easy.ClientAccount
  alias Easy.Ctx
  alias Easy.Identity.Token
  alias Easy.Utils

  channel "conversation:*", EasyWeb.ConversationChannel
  channel "inbox", EasyWeb.InboxChannel

  @impl true
  @spec connect(map(), Phoenix.Socket.t(), map()) :: {:ok, Phoenix.Socket.t()} | :error
  def connect(%{"token" => token}, socket, _connect_info) do
    with {:ok, claims} <- Token.authenticate_access_token(token),
         role when not is_nil(role) <- Utils.safe_to_atom(claims["role"], [:coach, :client]) do
      ctx = Ctx.new(claims["business_id"], claims["user_id"], claims["coach_id"], claims["is_owner"] == true)
      assign_actor(socket, role, ctx)
    else
      _ -> :error
    end
  end

  def connect(_params, _socket, _connect_info), do: :error

  @impl true
  @spec id(Phoenix.Socket.t()) :: String.t()
  def id(socket), do: "user_socket:#{socket.assigns.ctx.user_id}"

  defp assign_actor(socket, :coach, ctx), do: {:ok, assign(socket, ctx: ctx, role: :coach)}

  defp assign_actor(socket, :client, ctx) do
    case ClientAccount.get_active_client(ctx) do
      {:ok, client} -> {:ok, assign(socket, ctx: %{ctx | client_id: client.id}, role: :client)}
      {:error, :not_found} -> :error
    end
  end
end

defmodule EasyWeb.UserSocket do
  use Phoenix.Socket

  alias Easy.Ctx
  alias Easy.Identity.Token
  alias Easy.Utils

  channel "conversation:*", EasyWeb.ConversationChannel
  channel "inbox", EasyWeb.InboxChannel

  @impl true
  def connect(%{"token" => token}, socket, _connect_info) do
    with {:ok, claims} <- Token.verify_access_token(token),
         role when not is_nil(role) <- Utils.safe_to_atom(claims["role"], ~w(coach client)) do
      ctx = Ctx.new(claims["business_id"], claims["user_id"], claims["coach_id"], claims["is_owner"] == true)
      {:ok, assign(socket, ctx: ctx, role: role)}
    else
      _ -> :error
    end
  end

  def connect(_params, _socket, _connect_info), do: :error

  @impl true
  def id(socket), do: "user_socket:#{socket.assigns.ctx.user_id}"
end

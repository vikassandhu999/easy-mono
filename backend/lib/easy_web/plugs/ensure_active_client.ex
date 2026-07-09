defmodule EasyWeb.Plugs.EnsureActiveClient do
  import Plug.Conn

  alias Easy.Clients.Client
  alias Easy.Repo

  def init(opts), do: opts

  @spec call(Plug.Conn.t(), any()) :: Plug.Conn.t()
  def call(conn, _opts) do
    ctx = conn.assigns.ctx

    active? =
      Client
      |> Client.for_business(ctx.business_id)
      |> Client.for_user(ctx.user_id)
      |> Client.accepted()
      |> Repo.exists?()

    if active?, do: conn, else: deny(conn)
  end

  defp deny(conn) do
    conn
    |> put_status(:forbidden)
    |> Phoenix.Controller.json(%{
      error_code: "client_inactive",
      error_message: "Your coaching subscription is not active.",
      error_detail: %{}
    })
    |> halt()
  end
end

defmodule EasyWeb.Clients.ProfileController do
  use EasyWeb, :controller

  alias Easy.Clients.Client
  alias Easy.Repo

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, _params) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    case Client
         |> Client.for_business(business_id)
         |> Client.for_user(user_id)
         |> Client.with_preloads()
         |> Repo.one() do
      nil -> {:error, :not_found}
      client -> render(conn, :show, client: client)
    end
  end
end

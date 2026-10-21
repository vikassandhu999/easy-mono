defmodule EasyWeb.Coaches.CoachingTermController do
  use EasyWeb, :typed_controller
  alias Easy.CoachingTerms
  alias EasyWeb.Types.CoachingTerm
  typed(:create, path: %{id: Ecto.UUID.t()}, ok: {201, data(CoachingTerm.t())})
  typed(:update, path: %{id: Ecto.UUID.t()}, body: CoachingTerm.update(), ok: {200, data(CoachingTerm.t())})
  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, _params) do
    with {:ok, term} <- CoachingTerms.start_term_for_client(conn.assigns.ctx, conn.path_params["id"]), do: ok(conn, %{data: term})
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    with {:ok, term} <- CoachingTerms.update_term(conn.assigns.ctx, conn.path_params["id"], conn.body_params), do: ok(conn, %{data: term})
  end
end

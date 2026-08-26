defmodule EasyWeb.Coaches.MuscleController do
  use EasyWeb, :controller
  use EasyWeb.TypedRoute

  alias Easy.Training.Library
  alias EasyWeb.Types.Training.Muscle

  typed(:index, query: Muscle.list_query(), ok: {200, data([Muscle.t()])})

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params) do
    with {:ok, muscles} <- Library.list_muscles(conn.query_params["search"]) do
      ok(conn, %{data: muscles})
    end
  end
end

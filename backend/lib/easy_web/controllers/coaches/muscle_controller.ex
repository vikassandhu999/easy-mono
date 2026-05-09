defmodule EasyWeb.Coaches.MuscleController do
  use EasyWeb, :controller

  alias Easy.Training.Reads

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    search = Map.get(params, "search", "")

    with {:ok, muscles} <- Reads.list_muscles(search) do
      render(conn, :index, muscles: muscles)
    end
  end
end

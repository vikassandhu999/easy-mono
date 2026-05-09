defmodule EasyWeb.Clients.ExerciseController do
  use EasyWeb, :controller

  alias Easy.Training.Reads

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    %{business_id: business_id} = conn.assigns.claims

    offset = parse_integer(params, "offset", 0)
    limit = parse_integer(params, "limit", 50)
    search = Map.get(params, "search", "")
    muscle_ids = parse_list(params, "muscle_ids")

    with {:ok, %{exercises: exercises, count: count}} <-
           Reads.list_exercises(business_id, search, muscle_ids, offset, limit) do
      render(conn, :index, exercises: exercises, count: count)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, exercise} <- Reads.fetch_exercise(business_id, id) do
      render(conn, :show, exercise: exercise)
    end
  end
end

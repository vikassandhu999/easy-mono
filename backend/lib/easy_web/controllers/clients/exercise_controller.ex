defmodule EasyWeb.Clients.ExerciseController do
  use EasyWeb, :controller

  alias Easy.Repo
  alias Easy.Training.Exercise

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    %{business_id: business_id} = conn.assigns.claims

    offset = parse_integer(params, "offset", 0)
    limit = parse_integer(params, "limit", 50)
    search = Map.get(params, "search", "")
    muscle_ids = parse_list(params, "muscle_ids")

    base =
      Exercise
      |> Exercise.for_business(business_id)
      |> Exercise.search(search)
      |> Exercise.with_muscle_ids(muscle_ids)

    count = Repo.aggregate(base, :count, :id)

    exercises =
      base
      |> Exercise.newest()
      |> Easy.Utils.paginate(offset, limit)
      |> Exercise.with_preloads()
      |> Repo.all()

    render(conn, :index, exercises: exercises, count: count)
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    case Exercise
         |> Exercise.for_business(business_id)
         |> Exercise.with_preloads()
         |> Repo.get(id) do
      nil -> {:error, :not_found}
      exercise -> render(conn, :show, exercise: exercise)
    end
  end
end

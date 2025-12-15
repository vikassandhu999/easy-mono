defmodule EasyWeb.Coach.MuscleController do
  use EasyWeb, :controller

  alias Easy.Training.Library.Muscle
  alias Easy.Repo
  import Ecto.Query

  def index(conn, params) do
    muscles = list_muscles(params)
    render(conn, :index, muscles: muscles)
  end

  defp list_muscles(params) do
    search_term = params["search"]

    Muscle
    |> search(search_term)
    |> Repo.all()
  end

  defp search(query, nil), do: query
  defp search(query, ""), do: query

  defp search(query, search_term) do
    search_term = "%#{search_term}%"
    where(query, [m], ilike(m.name, ^search_term))
  end
end

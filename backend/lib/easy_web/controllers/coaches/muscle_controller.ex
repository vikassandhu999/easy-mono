defmodule EasyWeb.Coaches.MuscleController do
  use EasyWeb, :controller

  alias Easy.Repo
  alias Easy.Training.Muscle

  def index(conn, params) do
    search = Map.get(params, "search", "")

    muscles =
      Muscle
      |> Muscle.search(search)
      |> Muscle.alphabetical()
      |> Repo.all()

    render(conn, :index, muscles: muscles)
  end
end

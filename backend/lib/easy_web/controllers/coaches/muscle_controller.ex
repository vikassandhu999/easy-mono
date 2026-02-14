defmodule EasyWeb.Coaches.MuscleController do
  use EasyWeb, :controller

  alias Easy.Training

  def index(conn, params) do
    {:ok, muscles} = Training.list_muscles(params)
    render(conn, :index, muscles: muscles)
  end
end

defmodule EasyWeb.Clients.TrainingPlanController do
  use EasyWeb, :controller

  alias Easy.Clients.Client
  alias Easy.Repo
  alias Easy.Training.TrainingPlan

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, client} <- Client.get_for_user(business_id, user_id) do
      offset = parse_integer(params, "offset", 0)
      limit = parse_integer(params, "limit", 50)
      status = parse_enum(params, "status", TrainingPlan.statuses())

      base =
        TrainingPlan
        |> TrainingPlan.for_business(business_id)
        |> TrainingPlan.for_client(client.id)
        |> TrainingPlan.with_status(status)

      count = Repo.aggregate(base, :count, :id)

      plans =
        base
        |> TrainingPlan.newest()
        |> Easy.Utils.paginate(offset, limit)
        |> TrainingPlan.with_workouts()
        |> Repo.all()

      render(conn, :index, plans: plans, count: count)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => id}) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, client} <- Client.get_for_user(business_id, user_id) do
      case TrainingPlan
           |> TrainingPlan.for_business(business_id)
           |> TrainingPlan.for_client(client.id)
           |> TrainingPlan.with_workouts()
           |> Repo.get(id) do
        nil -> {:error, :not_found}
        plan -> render(conn, :show, plan: plan)
      end
    end
  end
end

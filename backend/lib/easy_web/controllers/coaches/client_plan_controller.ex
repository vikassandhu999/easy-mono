defmodule EasyWeb.Coaches.ClientPlanController do
  use EasyWeb, :controller

  alias Easy.Clients.Client
  alias Easy.Nutrition.Plan
  alias Easy.Repo
  alias Easy.Training.TrainingPlan

  @spec training_plans(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def training_plans(conn, %{"client_id" => client_id} = params) do
    %{business_id: business_id} = conn.assigns.claims

    with true <- Client.accessible?(business_id, client_id) do
      offset = parse_integer(params, "offset", 0)
      limit = parse_integer(params, "limit", 50)
      status = parse_enum(params, "status", TrainingPlan.statuses())

      base =
        TrainingPlan
        |> TrainingPlan.for_business(business_id)
        |> TrainingPlan.for_client(client_id)
        |> TrainingPlan.with_status(status)

      count = Repo.aggregate(base, :count, :id)

      plans =
        base
        |> TrainingPlan.newest()
        |> Easy.Utils.paginate(offset, limit)
        |> TrainingPlan.with_workouts()
        |> Repo.all()
        |> Repo.preload(:client)

      render(conn, :training_plans, plans: plans, count: count)
    else
      false -> {:error, :not_found}
    end
  end

  @spec nutrition_plans(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def nutrition_plans(conn, %{"client_id" => client_id} = params) do
    %{business_id: business_id} = conn.assigns.claims

    with true <- Client.accessible?(business_id, client_id) do
      offset = parse_integer(params, "offset", 0)
      limit = parse_integer(params, "limit", 10)
      status = parse_enum(params, "status", Plan.statuses())

      base =
        Plan
        |> Plan.for_business(business_id)
        |> Plan.for_client(client_id)
        |> Plan.with_status(status)

      count = Repo.aggregate(base, :count, :id)

      plans =
        base
        |> Plan.newest()
        |> Easy.Utils.paginate(offset, limit)
        |> Plan.with_meals()
        |> Plan.with_plan_items()
        |> Repo.all()
        |> Repo.preload(:client)

      render(conn, :nutrition_plans, plans: plans, count: count)
    else
      false -> {:error, :not_found}
    end
  end
end

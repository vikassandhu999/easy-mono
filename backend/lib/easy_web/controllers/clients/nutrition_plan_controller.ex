defmodule EasyWeb.Clients.NutritionPlanController do
  use EasyWeb, :controller

  alias Easy.Clients.Client
  alias Easy.Nutrition.Plan
  alias Easy.Nutrition.PlanItem
  alias Easy.Repo

  import Ecto.Query, only: [limit: 2]

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, client} <- Client.get_for_user(business_id, user_id) do
      offset = parse_integer(params, "offset", 0)
      lim = parse_integer(params, "limit", 50)
      status = parse_enum(params, "status", Plan.statuses())

      base =
        Plan
        |> Plan.for_business(business_id)
        |> Plan.for_client(client.id)
        |> Plan.with_status(status)

      count = Repo.aggregate(base, :count, :id)

      plans =
        base
        |> Plan.newest()
        |> Easy.Utils.paginate(offset, lim)
        |> Repo.all()

      render(conn, :index, plans: plans, count: count)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => id}) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, client} <- Client.get_for_user(business_id, user_id) do
      case Plan
           |> Plan.for_business(business_id)
           |> Plan.for_client(client.id)
           |> Plan.with_meals()
           |> Plan.with_plan_items()
           |> Repo.get(id) do
        nil -> {:error, :not_found}
        plan -> render(conn, :show, plan: plan)
      end
    end
  end

  @spec today(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def today(conn, params) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    date = Easy.Utils.safe_date(params["date"]) || Date.utc_today()
    day = Easy.Utils.weekday_name(date)

    with {:ok, client} <- Client.get_for_user(business_id, user_id) do
      case Plan
           |> Plan.for_business(business_id)
           |> Plan.active_for_client(client.id, date)
           |> Plan.newest()
           |> limit(1)
           |> Repo.one() do
        nil ->
          {:error, :not_found}

        plan ->
          plan_items =
            PlanItem
            |> PlanItem.for_plan(plan.id)
            |> PlanItem.for_business(business_id)
            |> PlanItem.for_day(day)
            |> PlanItem.with_meal_and_items()
            |> Repo.all()

          render(conn, :today, plan: plan, plan_items: plan_items, date: date, day: day)
      end
    end
  end
end

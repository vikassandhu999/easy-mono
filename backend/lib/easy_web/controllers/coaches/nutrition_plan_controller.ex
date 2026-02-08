defmodule EasyWeb.Coaches.NutritionPlanController do
  use EasyWeb, :controller

  alias Easy.Clients.Client
  alias Easy.Nutrition.Plan
  alias Easy.Orgs.Coaches
  alias Easy.Repo

  def create(conn, params) do
    claims = conn.assigns.claims

    with {:ok, coach} <- Coaches.get_by_user_id(claims.user_id, claims.business_id),
         {:ok, plan} <- Plan.create(claims.business_id, coach.id, params) do
      conn
      |> put_status(:created)
      |> render(:show, plan: plan)
    end
  end

  def show(conn, %{"id" => plan_id}) do
    %{business_id: business_id} = conn.assigns.claims

    case Plan
         |> Plan.for_business(business_id)
         |> Plan.with_meals()
         |> Plan.with_plan_items()
         |> Repo.get(plan_id) do
      nil -> {:error, :not_found}
      plan -> render(conn, :show, plan: plan)
    end
  end

  def update(conn, %{"id" => plan_id}) do
    %{business_id: business_id} = conn.assigns.claims

    with plan when not is_nil(plan) <- Plan |> Plan.for_business(business_id) |> Repo.get(plan_id),
         {:ok, updated_plan} <- Plan.update(plan, conn.body_params) do
      render(conn, :show, plan: updated_plan)
    else
      nil -> {:error, :not_found}
      error -> error
    end
  end

  def delete(conn, %{"id" => plan_id}) do
    %{business_id: business_id} = conn.assigns.claims

    with plan when not is_nil(plan) <- Plan |> Plan.for_business(business_id) |> Repo.get(plan_id),
         {:ok, _deleted} <- Plan.delete(plan) do
      send_resp(conn, :no_content, "")
    else
      nil -> {:error, :not_found}
      error -> error
    end
  end

  def index(conn, params) do
    %{business_id: business_id} = conn.assigns.claims

    offset = parse_integer(params, "offset", 0)
    limit = parse_integer(params, "limit", 10)
    status = parse_enum(params, "status", Plan.statuses())
    type = parse_enum(params, "type", Plan.types())

    base =
      Plan
      |> Plan.for_business(business_id)
      |> Plan.with_status(status)
      |> Plan.with_type(type)

    count = Repo.aggregate(base, :count, :id)

    plans =
      base
      |> Plan.newest()
      |> Easy.Utils.paginate(offset, limit)
      |> Repo.all()

    conn
    |> put_status(:ok)
    |> render(:index, count: count, plans: plans)
  end

  def assign(conn, %{"id" => plan_id, "client_id" => client_id}) do
    claims = conn.assigns.claims

    with {:ok, coach} <- Coaches.get_by_user_id(claims.user_id, claims.business_id),
         plan when not is_nil(plan) <-
           Plan |> Plan.for_business(claims.business_id) |> Repo.get(plan_id),
         client when not is_nil(client) <-
           Client |> Client.for_business(claims.business_id) |> Repo.get(client_id),
         {:ok, new_plan} <- Plan.assign_to_client(plan, client_id, coach.id) do
      conn
      |> put_status(:created)
      |> render(:show, plan: new_plan)
    else
      nil -> {:error, :not_found}
      error -> error
    end
  end

  def duplicate(conn, %{"id" => plan_id}) do
    claims = conn.assigns.claims

    with {:ok, coach} <- Coaches.get_by_user_id(claims.user_id, claims.business_id),
         plan when not is_nil(plan) <-
           Plan |> Plan.for_business(claims.business_id) |> Repo.get(plan_id),
         {:ok, new_plan} <- Plan.duplicate(plan, coach.id) do
      conn
      |> put_status(:created)
      |> render(:show, plan: new_plan)
    else
      nil -> {:error, :not_found}
      error -> error
    end
  end

  def shopping_list(conn, %{"id" => plan_id}) do
    %{business_id: business_id} = conn.assigns.claims

    with plan when not is_nil(plan) <-
           Plan
           |> Plan.for_business(business_id)
           |> Repo.get(plan_id),
         {:ok, items} <- Plan.shopping_list(plan) do
      render(conn, :shopping_list, items: items)
    else
      nil -> {:error, :not_found}
      error -> error
    end
  end

  def macros(conn, %{"id" => plan_id}) do
    %{business_id: business_id} = conn.assigns.claims

    with plan when not is_nil(plan) <-
           Plan
           |> Plan.for_business(business_id)
           |> Repo.get(plan_id),
         {:ok, macros} <- Plan.macros(plan) do
      render(conn, :macros, macros: macros)
    else
      nil -> {:error, :not_found}
      error -> error
    end
  end

  def copy_day(conn, %{"id" => plan_id} = params) do
    claims = conn.assigns.claims

    with {:ok, coach} <- Coaches.get_by_user_id(claims.user_id, claims.business_id),
         plan when not is_nil(plan) <-
           Plan |> Plan.for_business(claims.business_id) |> Repo.get(plan_id),
         {:ok, items} <-
           Plan.copy_day(
             plan,
             Map.get(params, "source_day"),
             Map.get(params, "target_day"),
             coach.id
           ) do
      render(conn, :plan_items, plan_items: items)
    else
      nil -> {:error, :not_found}
      error -> error
    end
  end

  def reorder_meals(conn, %{"id" => plan_id, "meal_ids" => meal_ids}) do
    %{business_id: business_id} = conn.assigns.claims

    with plan when not is_nil(plan) <- Plan |> Plan.for_business(business_id) |> Repo.get(plan_id),
         {:ok, meals} <- Plan.reorder_meals(plan, meal_ids) do
      render(conn, :meals, meals: meals)
    else
      nil -> {:error, :not_found}
      error -> error
    end
  end

  defp parse_enum(params, key, allowed) do
    case Map.get(params, key) do
      nil -> nil
      value when is_binary(value) -> Easy.Utils.safe_to_atom(value, allowed)
      value when is_atom(value) -> if Enum.member?(allowed, value), do: value, else: nil
      _ -> nil
    end
  end
end

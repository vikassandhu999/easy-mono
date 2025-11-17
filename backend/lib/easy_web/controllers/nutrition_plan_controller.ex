defmodule EasyWeb.NutritionPlanController do
  use EasyWeb, :controller
  import Ecto.Query, warn: false

  alias Easy.Repo
  alias EasyWeb.FallbackController
  alias Easy.Utils
  alias Easy.Nutrition.NutritionPlan

  plug :authorize_resource when action in [:show, :update, :delete]

  def index(conn, params) do
    with claims <- conn.assigns.token_claims,
         business_id <- claims["business_id"] do
      limit = Utils.safe_int(params["limit"] || "50")
      offset = Utils.safe_int(params["offset"] || "0")
      status = params["status"]

      is_template = Utils.parse_boolean(params["is_template"])
      search_query = Utils.parse_search(params["search"])

      base_query =
        from np in NutritionPlan,
          where: np.business_id == ^business_id,
          order_by: [desc: np.inserted_at]

      query =
        if status do
          status_atom = String.to_atom(status)
          from np in base_query, where: np.status == ^status_atom
        else
          base_query
        end

      query =
        case is_template do
          true -> from np in query, where: np.is_template == true and is_nil(np.client_id)
          false -> from np in query, where: np.is_template == false and not is_nil(np.client_id)
          _ -> query
        end

      query =
        if search_query do
          from np in query, where: ilike(np.name, ^"%#{search_query}%")
        else
          query
        end

      total = query |> Repo.aggregate(:count)

      nutrition_plans =
        query
        |> limit(^limit)
        |> offset(^offset)
        |> Repo.all()

      conn
      |> put_status(:ok)
      |> render(:index, %{
        nutrition_plans: nutrition_plans,
        meta: %{
          limit: limit,
          offset: offset,
          total: total
        }
      })
    end
  end

  def create(conn, _params) do
    with claims <- conn.assigns.token_claims,
         business_id <- claims["business_id"],
         coach_id <- claims["coach_id"],
         attrs_with_ids =
           conn.body_params
           |> Map.put("business_id", business_id)
           |> Map.put("creator_id", coach_id),
         changeset = %NutritionPlan{} |> NutritionPlan.changeset(attrs_with_ids),
         {:ok, nutrition_plan} <- Repo.insert(changeset) do
      preloaded_plan = Repo.preload(nutrition_plan, plan_days: [day_items: [:recipe]])

      conn
      |> put_status(:created)
      |> render(:create, %{nutrition_plan: preloaded_plan})
    else
      {:error, changeset} ->
        FallbackController.unprocessable_entity_response(conn, changeset)
    end
  end

  def show(conn, _params) do
    plan = conn.assigns.nutrition_plan

    preloaded_plan = Repo.preload(plan, plan_days: [day_items: [:recipe]])

    conn
    |> put_status(:ok)
    |> render(:show, %{nutrition_plan: preloaded_plan})
  end

  def update(conn, _params) do
    plan = conn.assigns.nutrition_plan

    with {:ok, updated_plan} <-
           plan
           |> NutritionPlan.changeset(conn.body_params)
           |> Repo.update() do
      preloaded_plan = Repo.preload(updated_plan, plan_days: [day_items: [:recipe]])

      conn
      |> put_status(:ok)
      |> render(:update, %{nutrition_plan: preloaded_plan})
    else
      {:error, changeset} ->
        FallbackController.unprocessable_entity_response(conn, changeset)
    end
  end

  def delete(conn, _params) do
    plan = conn.assigns.nutrition_plan

    with {:ok, _deleted_plan} <- Repo.delete(plan) do
      send_resp(conn, :no_content, "")
    end
  end

  defp authorize_resource(conn, _opts) do
    with %{"id" => id} <- conn.params,
         %{"business_id" => business_id} <- conn.assigns.token_claims,
         %NutritionPlan{} = nutrition_plan <-
           Repo.one(
             from(p in NutritionPlan, where: p.id == ^id and p.business_id == ^business_id)
           ) do
      assign(conn, :nutrition_plan, nutrition_plan)
    else
      _ ->
        FallbackController.not_found_response(conn, "Plan not found.")
    end
  end
end

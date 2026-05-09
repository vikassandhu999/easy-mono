defmodule EasyWeb.Coaches.NutritionPlanController do
  use EasyWeb, :controller

  alias Easy.Nutrition.Plan
  alias Easy.Nutrition.Plans
  alias Easy.Nutrition.Reads
  alias Easy.Orgs.Coaches

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, params) do
    claims = conn.assigns.claims

    with {:ok, coach} <- Coaches.get_by_user_id(claims.user_id, claims.business_id),
         {:ok, plan} <- Plan.create(claims.business_id, coach.id, params) do
      conn
      |> put_status(:created)
      |> render(:show, plan: plan)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => plan_id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, plan} <- Reads.fetch_plan_full(business_id, plan_id) do
      render(conn, :show, plan: plan)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, %{"id" => plan_id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, plan} <- Reads.fetch_plan(business_id, plan_id),
         {:ok, updated_plan} <- Plan.update(plan, conn.body_params) do
      render(conn, :show, plan: updated_plan)
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, %{"id" => plan_id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, plan} <- Reads.fetch_plan(business_id, plan_id),
         {:ok, _deleted} <- Plan.delete(plan) do
      send_resp(conn, :no_content, "")
    end
  end

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    %{business_id: business_id} = conn.assigns.claims

    offset = parse_integer(params, "offset", 0)
    limit = parse_integer(params, "limit", 10)
    status = parse_enum(params, "status", Plan.statuses())

    with {:ok, %{count: count, plans: plans}} <-
           Reads.list_template_plans(business_id, status, offset, limit) do
      conn
      |> put_status(:ok)
      |> render(:index, count: count, plans: plans)
    end
  end

  @spec assign(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def assign(conn, %{"id" => plan_id, "client_id" => client_id} = params) do
    claims = conn.assigns.claims

    with {:ok, coach} <- Coaches.get_by_user_id(claims.user_id, claims.business_id),
         {:ok, plan} <- Reads.fetch_plan(claims.business_id, plan_id),
         {:ok, _client} <- Reads.fetch_client(claims.business_id, client_id),
         {:ok, new_plan} <- Plans.assign_to_client(plan, client_id, coach.id, params) do
      conn
      |> put_status(:created)
      |> render(:show, plan: new_plan)
    end
  end

  @spec duplicate(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def duplicate(conn, %{"id" => plan_id}) do
    claims = conn.assigns.claims

    with {:ok, coach} <- Coaches.get_by_user_id(claims.user_id, claims.business_id),
         {:ok, plan} <- Reads.fetch_plan(claims.business_id, plan_id),
         {:ok, new_plan} <- Plans.duplicate(plan, coach.id) do
      conn
      |> put_status(:created)
      |> render(:show, plan: new_plan)
    end
  end

  @spec shopping_list(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def shopping_list(conn, %{"id" => plan_id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, plan} <- Reads.fetch_plan(business_id, plan_id),
         {:ok, items} <- Plans.shopping_list(plan) do
      render(conn, :shopping_list, items: items)
    end
  end

  @spec macros(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def macros(conn, %{"id" => plan_id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, plan} <- Reads.fetch_plan(business_id, plan_id),
         {:ok, macros} <- Plans.macros(plan) do
      render(conn, :macros, macros: macros)
    end
  end

  @spec copy_day(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def copy_day(conn, %{"id" => plan_id} = params) do
    claims = conn.assigns.claims
    clear_existing = parse_boolean(params, "clear_existing") != false

    with {:ok, coach} <- Coaches.get_by_user_id(claims.user_id, claims.business_id),
         {:ok, plan} <- Reads.fetch_plan(claims.business_id, plan_id),
         {:ok, items} <-
           Plans.copy_day(
             plan,
             Map.get(params, "source_day"),
             Map.get(params, "target_day"),
             coach.id,
             clear_existing
           ) do
      render(conn, :plan_items, plan_items: items)
    end
  end
end

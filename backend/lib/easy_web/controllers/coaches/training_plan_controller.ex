defmodule EasyWeb.Coaches.TrainingPlanController do
  use EasyWeb, :controller

  alias Easy.TrainingPlans, as: Plans
  alias Easy.Training.TrainingPlan

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, params) do
    claims = conn.assigns.claims

    with {:ok, plan} <-
           Plans.create_training_plan_for_coach_user(claims.business_id, claims.user_id, params) do
      conn
      |> put_status(:created)
      |> render(:show, plan: plan)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, plan} <- Plans.fetch_plan_full(business_id, id) do
      render(conn, :show, plan: plan)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, updated} <- Plans.update_training_plan(business_id, id, conn.body_params) do
      render(conn, :show, plan: updated)
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, _plan} <- Plans.delete_training_plan(business_id, id) do
      send_resp(conn, :no_content, "")
    end
  end

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    %{business_id: business_id} = conn.assigns.claims

    offset = parse_integer(params, "offset", 0)
    limit = parse_integer(params, "limit", 50)
    search = Map.get(params, "search", "")
    status = parse_enum(params, "status", TrainingPlan.statuses())

    with {:ok, %{plans: plans, count: count}} <-
           Plans.list_template_plans(business_id, search, status, offset, limit) do
      render(conn, :index, plans: plans, count: count)
    end
  end

  @spec duplicate(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def duplicate(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, duplicated} <- Plans.duplicate_training_plan(business_id, id) do
      conn
      |> put_status(:created)
      |> render(:show, plan: duplicated)
    end
  end

  @spec assign(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def assign(conn, %{"id" => id, "client_id" => client_id} = params) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, assigned} <-
           Plans.assign_training_plan_to_client(
             business_id,
             id,
             client_id,
             params
           ) do
      conn
      |> put_status(:created)
      |> render(:show, plan: assigned)
    end
  end
end

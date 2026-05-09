defmodule EasyWeb.Coaches.TrainingPlanController do
  use EasyWeb, :controller

  alias Easy.Orgs.Coaches
  alias Easy.Training.Reads
  alias Easy.Training.TrainingPlan

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, params) do
    claims = conn.assigns.claims

    with {:ok, coach} <- Coaches.get_by_user_id(claims.user_id, claims.business_id),
         {:ok, plan} <- TrainingPlan.create(claims.business_id, coach.id, params) do
      conn
      |> put_status(:created)
      |> render(:show, plan: plan)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, plan} <- Reads.fetch_plan_full(business_id, id) do
      render(conn, :show, plan: plan)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, plan} <- Reads.fetch_plan(business_id, id),
         {:ok, updated} <- TrainingPlan.update(plan, conn.body_params) do
      render(conn, :show, plan: updated)
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, plan} <- Reads.fetch_plan(business_id, id),
         {:ok, _plan} <- TrainingPlan.delete(plan) do
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
           Reads.list_template_plans(business_id, search, status, offset, limit) do
      render(conn, :index, plans: plans, count: count)
    end
  end

  @spec duplicate(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def duplicate(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, plan} <- Reads.fetch_plan_full(business_id, id),
         {:ok, duplicated} <- TrainingPlan.duplicate(plan) do
      conn
      |> put_status(:created)
      |> render(:show, plan: duplicated)
    end
  end

  @spec assign(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def assign(conn, %{"id" => id, "client_id" => client_id} = params) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, plan} <- Reads.fetch_plan_full(business_id, id),
         {:ok, _client} <- Reads.fetch_client(business_id, client_id),
         {:ok, assigned} <-
           TrainingPlan.assign_to_client(
             plan,
             client_id,
             Map.get(params, "start_date"),
             Map.get(params, "end_date")
           ) do
      conn
      |> put_status(:created)
      |> render(:show, plan: assigned)
    end
  end
end

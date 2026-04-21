defmodule EasyWeb.Coaches.TrainingPlanController do
  use EasyWeb, :controller

  alias Easy.Clients.Client
  alias Easy.Orgs.Coaches
  alias Easy.Repo
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

    case TrainingPlan
         |> TrainingPlan.for_business(business_id)
         |> TrainingPlan.with_workouts()
         |> TrainingPlan.with_plan_items()
         |> Repo.get(id) do
      nil -> {:error, :not_found}
      plan -> render(conn, :show, plan: Repo.preload(plan, :client))
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    case TrainingPlan |> TrainingPlan.for_business(business_id) |> Repo.get(id) do
      nil ->
        {:error, :not_found}

      plan ->
        with {:ok, updated} <- TrainingPlan.update(plan, conn.body_params) do
          render(conn, :show, plan: updated)
        end
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    case TrainingPlan |> TrainingPlan.for_business(business_id) |> Repo.get(id) do
      nil ->
        {:error, :not_found}

      plan ->
        with {:ok, _plan} <- TrainingPlan.delete(plan) do
          send_resp(conn, :no_content, "")
        end
    end
  end

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    %{business_id: business_id} = conn.assigns.claims

    offset = parse_integer(params, "offset", 0)
    limit = parse_integer(params, "limit", 50)
    search = Map.get(params, "search", "")
    status = parse_enum(params, "status", TrainingPlan.statuses())

    base =
      TrainingPlan
      |> TrainingPlan.for_business(business_id)
      |> TrainingPlan.search(search)
      |> TrainingPlan.with_status(status)
      |> TrainingPlan.templates()

    count = Repo.aggregate(base, :count, :id)

    plans =
      base
      |> TrainingPlan.newest()
      |> Easy.Utils.paginate(offset, limit)
      |> TrainingPlan.with_workouts()
      |> TrainingPlan.with_plan_items()
      |> Repo.all()

    render(conn, :index, plans: plans, count: count)
  end

  @spec duplicate(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def duplicate(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    case TrainingPlan
         |> TrainingPlan.for_business(business_id)
         |> TrainingPlan.with_workouts()
         |> TrainingPlan.with_plan_items()
         |> Repo.get(id) do
      nil ->
        {:error, :not_found}

      plan ->
        with {:ok, duplicated} <- TrainingPlan.duplicate(plan) do
          conn
          |> put_status(:created)
          |> render(:show, plan: duplicated)
        end
    end
  end

  @spec assign(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def assign(conn, %{"id" => id, "client_id" => client_id} = params) do
    %{business_id: business_id} = conn.assigns.claims

    with plan when not is_nil(plan) <-
           TrainingPlan
           |> TrainingPlan.for_business(business_id)
           |> TrainingPlan.with_workouts()
           |> TrainingPlan.with_plan_items()
           |> Repo.get(id),
         true <- Client.accessible?(business_id, client_id),
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
    else
      nil -> {:error, :not_found}
      false -> {:error, :not_found}
      error -> error
    end
  end
end

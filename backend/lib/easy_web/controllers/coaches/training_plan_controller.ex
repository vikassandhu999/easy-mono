defmodule EasyWeb.Coaches.TrainingPlanController do
  use EasyWeb, :controller

  alias Easy.Clients.Client
  alias Easy.Orgs.Coaches
  alias Easy.Repo
  alias Easy.Training.TrainingPlan

  def create(conn, params) do
    claims = conn.assigns.claims

    with {:ok, coach} <- Coaches.get_by_user_id(claims.user_id, claims.business_id),
         {:ok, plan} <- TrainingPlan.create(claims.business_id, coach.id, params) do
      conn
      |> put_status(:created)
      |> render(:show, plan: plan)
    end
  end

  def show(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    case TrainingPlan
         |> TrainingPlan.for_business(business_id)
         |> TrainingPlan.with_workouts()
         |> Repo.get(id) do
      nil -> {:error, :not_found}
      plan -> render(conn, :show, plan: plan)
    end
  end

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

  def index(conn, params) do
    %{business_id: business_id} = conn.assigns.claims

    offset = parse_integer(params, "offset", 0)
    limit = parse_integer(params, "limit", 50)
    search = Map.get(params, "search", "")
    client_id = Map.get(params, "client_id")
    status = parse_enum(params, "status", TrainingPlan.statuses())
    template = parse_boolean(params, "is_template")

    base =
      TrainingPlan
      |> TrainingPlan.for_business(business_id)
      |> TrainingPlan.search(search)
      |> TrainingPlan.with_status(status)
      |> TrainingPlan.is_template(template)
      |> maybe_for_client(client_id)

    count = Repo.aggregate(base, :count, :id)

    plans =
      base
      |> TrainingPlan.newest()
      |> Easy.Utils.paginate(offset, limit)
      |> TrainingPlan.with_workouts()
      |> Repo.all()

    render(conn, :index, plans: plans, count: count)
  end

  def duplicate(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    case TrainingPlan
         |> TrainingPlan.for_business(business_id)
         |> TrainingPlan.with_workouts()
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

  def assign(conn, %{"id" => id, "client_id" => client_id} = params) do
    %{business_id: business_id} = conn.assigns.claims

    with plan when not is_nil(plan) <-
           TrainingPlan
           |> TrainingPlan.for_business(business_id)
           |> TrainingPlan.with_workouts()
           |> Repo.get(id),
         true <- client_accessible?(business_id, client_id),
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

  defp maybe_for_client(query, nil), do: query
  defp maybe_for_client(query, ""), do: query
  defp maybe_for_client(query, client_id), do: TrainingPlan.for_client(query, client_id)

  defp client_accessible?(business_id, client_id) do
    Client
    |> Client.for_business(business_id)
    |> Repo.get(client_id)
    |> is_struct(Client)
  end
end

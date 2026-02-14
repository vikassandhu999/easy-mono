defmodule EasyWeb.Coaches.TrainingPlanController do
  use EasyWeb, :controller

  alias Easy.Orgs.Coaches
  alias Easy.Training

  def create(conn, params) do
    claims = conn.assigns.claims

    with {:ok, coach} <- Coaches.get_by_user_id(claims.user_id, claims.business_id),
         {:ok, plan} <- Training.create_training_plan(claims.business_id, coach.id, params) do
      conn
      |> put_status(:created)
      |> render(:show, plan: plan)
    end
  end

  def show(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, plan} <- Training.fetch_training_plan(business_id, id) do
      render(conn, :show, plan: plan)
    end
  end

  def update(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, plan} <- Training.update_training_plan(business_id, id, conn.body_params) do
      render(conn, :show, plan: plan)
    end
  end

  def delete(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, _plan} <- Training.delete_training_plan(business_id, id) do
      send_resp(conn, :no_content, "")
    end
  end

  def index(conn, params) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, {plans, pagination}} <- Training.list_training_plans(business_id, params) do
      render(conn, :index, plans: plans, count: pagination.count)
    end
  end

  def duplicate(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, plan} <- Training.duplicate_training_plan(business_id, id) do
      conn
      |> put_status(:created)
      |> render(:show, plan: plan)
    end
  end

  def assign(conn, %{"id" => id, "client_id" => client_id} = params) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, plan} <-
           Training.assign_training_plan(
             business_id,
             id,
             client_id,
             Map.get(params, "start_date"),
             Map.get(params, "end_date")
           ) do
      conn
      |> put_status(:created)
      |> render(:show, plan: plan)
    end
  end
end

defmodule EasyWeb.TrainingPlanController do
  use EasyWeb, :controller

  alias Easy.Training
  alias Easy.Training.Programming.TrainingPlan

  def index(conn, params) do
    business_id = conn.assigns[:current_business_id]
    is_template = Map.get(params, "is_template")

    training_plans =
      Training.list_training_plans(business_id: business_id, is_template: is_template)

    render(conn, :index, training_plans: training_plans)
  end

  def create(conn, %{"training_plan" => plan_params}) do
    business_id = conn.assigns[:current_business_id]
    # Assuming author_id comes from current user (coach)
    author_id = conn.assigns[:current_user_id]

    plan_params =
      plan_params
      |> Map.put("business_id", business_id)
      |> Map.put("author_id", author_id)

    with {:ok, %TrainingPlan{} = training_plan} <- Training.create_training_plan(plan_params) do
      conn
      |> put_status(:created)
      |> put_resp_header("location", ~p"/api/training_plans/#{training_plan}")
      |> render(:show, training_plan: training_plan)
    end
  end

  def show(conn, %{"id" => id}) do
    training_plan = Training.get_training_plan!(id)
    render(conn, :show, training_plan: training_plan)
  end

  def update(conn, %{"id" => id, "training_plan" => plan_params}) do
    training_plan = Training.get_training_plan!(id)

    if training_plan.business_id == conn.assigns[:current_business_id] do
      with {:ok, %TrainingPlan{} = training_plan} <-
             Training.update_training_plan(training_plan, plan_params) do
        render(conn, :show, training_plan: training_plan)
      end
    else
      {:error, :forbidden}
    end
  end

  def assign(conn, %{"id" => id, "client_id" => client_id}) do
    # Verify template exists and belongs to business
    template = Training.get_training_plan!(id)

    if template.business_id == conn.assigns[:current_business_id] do
      with {:ok, %{new_plan: new_plan}} <- Training.assign_training_plan_to_client(id, client_id) do
        # Fetch full plan to render
        full_plan = Training.get_training_plan!(new_plan.id)

        conn
        |> put_status(:created)
        |> render(:show, training_plan: full_plan)
      end
    else
      {:error, :forbidden}
    end
  end
end

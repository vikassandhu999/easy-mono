defmodule EasyWeb.TrainingPlanController do
  use EasyWeb, :controller

  alias Easy.Training
  alias EasyWeb.FallbackController

  plug :authorize_resource when action in [:show, :update, :delete, :assign, :duplicate]

  def index(conn, params) do
    with claims <- conn.assigns.token_claims,
         business_id <- claims["business_id"],
         {:ok, {training_plans, meta}} <- Training.list_training_plans(business_id, params) do
      conn
      |> put_status(:ok)
      |> render(:index, %{
        training_plans: training_plans,
        meta: meta
      })
    end
  end

  def create(conn, %{"training_plan" => plan_params}) do
    with claims <- conn.assigns.token_claims,
         business_id <- claims["business_id"],
         author_id <- claims["coach_id"],
         {:ok, training_plan} <-
           Training.create_training_plan(business_id, author_id, plan_params) do
      conn
      |> put_status(:created)
      |> render(:show, %{training_plan: training_plan})
    end
  end

  def show(conn, _params) do
    conn
    |> put_status(:ok)
    |> render(:show, %{training_plan: conn.assigns.training_plan})
  end

  def update(conn, %{"training_plan" => plan_params}) do
    with {:ok, updated_plan} <-
           Training.update_training_plan(conn.assigns.training_plan, plan_params) do
      conn
      |> put_status(:ok)
      |> render(:show, %{training_plan: updated_plan})
    end
  end

  def delete(conn, _params) do
    with {:ok, _deleted_plan} <- Training.delete_training_plan(conn.assigns.training_plan) do
      send_resp(conn, :no_content, "")
    end
  end

  def assign(conn, %{
        "client_id" => client_id,
        "start_date" => start_date_str,
        "end_date" => end_date_str
      }) do
    training_plan = conn.assigns.training_plan
    business_id = conn.assigns.token_claims["business_id"]

    with {:ok, start_date} <- parse_date(start_date_str, :start_date),
         {:ok, end_date} <- parse_date(end_date_str, :end_date),
         {:ok, %{new_plan: new_plan}} <-
           Training.assign_training_plan_to_client(
             business_id,
             training_plan.id,
             client_id,
             start_date,
             end_date
           ) do
      # Fetch the full plan with preloads for rendering
      full_plan = Training.get_training_plan!(new_plan.id)

      conn
      |> put_status(:created)
      |> render(:show, %{training_plan: full_plan})
    end
  end

  def assign(conn, %{"client_id" => _client_id}) do
    conn
    |> put_status(:unprocessable_entity)
    |> json(%{errors: %{start_date: ["is required"], end_date: ["is required"]}})
  end

  def duplicate(conn, _params) do
    training_plan = conn.assigns.training_plan
    business_id = conn.assigns.token_claims["business_id"]

    with {:ok, duplicated_plan} <-
           Training.duplicate_training_plan(business_id, training_plan.id) do
      conn
      |> put_status(:created)
      |> render(:show, %{training_plan: duplicated_plan})
    end
  end

  defp parse_date(nil, field), do: {:error, {field, "is required"}}

  defp parse_date(date_string, field) when is_binary(date_string) do
    case Date.from_iso8601(date_string) do
      {:ok, date} -> {:ok, date}
      {:error, _} -> {:error, {field, "is invalid"}}
    end
  end

  defp parse_date(_, field), do: {:error, {field, "is invalid"}}

  defp authorize_resource(conn, _opts) do
    with %{"id" => id} <- conn.params,
         %{"business_id" => business_id} <- conn.assigns.token_claims,
         {:ok, training_plan} <- Training.fetch_training_plan(business_id, id) do
      assign(conn, :training_plan, training_plan)
    else
      _ ->
        FallbackController.not_found_response(conn, "Training plan not found.")
    end
  end
end

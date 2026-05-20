defmodule Easy.Training.PlanReads do
  alias Easy.Repo
  alias Easy.Training.PlanItem
  alias Easy.Training.TrainingPlan

  import Ecto.Query

  @spec fetch_plan(String.t(), String.t()) :: {:ok, TrainingPlan.t()} | {:error, :not_found}
  def fetch_plan(business_id, plan_id) do
    TrainingPlan
    |> TrainingPlan.for_business(business_id)
    |> Repo.get(plan_id)
    |> ok_or_not_found()
  end

  @spec fetch_plan_full(String.t(), String.t()) ::
          {:ok, TrainingPlan.t()} | {:error, :not_found}
  def fetch_plan_full(business_id, plan_id) do
    TrainingPlan
    |> TrainingPlan.for_business(business_id)
    |> TrainingPlan.with_workouts()
    |> TrainingPlan.with_plan_items()
    |> preload(:client)
    |> Repo.get(plan_id)
    |> ok_or_not_found()
  end

  @spec fetch_client_plan_full(String.t(), String.t(), String.t()) ::
          {:ok, TrainingPlan.t()} | {:error, :not_found}
  def fetch_client_plan_full(business_id, client_id, plan_id) do
    TrainingPlan
    |> TrainingPlan.for_business(business_id)
    |> TrainingPlan.for_client(client_id)
    |> TrainingPlan.with_workouts()
    |> TrainingPlan.with_plan_items()
    |> Repo.get(plan_id)
    |> ok_or_not_found()
  end

  @spec list_template_plans(
          String.t(),
          String.t() | nil,
          atom() | nil,
          non_neg_integer(),
          pos_integer()
        ) ::
          {:ok, %{count: non_neg_integer(), plans: [TrainingPlan.t()]}}
  def list_template_plans(business_id, search, status, offset, limit) do
    base =
      TrainingPlan
      |> TrainingPlan.for_business(business_id)
      |> TrainingPlan.search(search)
      |> TrainingPlan.with_status(status)
      |> TrainingPlan.templates()

    {:ok,
     %{
       count: Repo.aggregate(base, :count, :id),
       plans:
         base
         |> TrainingPlan.newest()
         |> Easy.Utils.paginate(offset, limit)
         |> TrainingPlan.with_workouts()
         |> TrainingPlan.with_plan_items()
         |> Repo.all()
     }}
  end

  @spec list_client_plans(
          String.t(),
          String.t(),
          atom() | nil,
          non_neg_integer(),
          pos_integer()
        ) ::
          {:ok, %{count: non_neg_integer(), plans: [TrainingPlan.t()]}}
  def list_client_plans(business_id, client_id, status, offset, limit) do
    base =
      TrainingPlan
      |> TrainingPlan.for_business(business_id)
      |> TrainingPlan.for_client(client_id)
      |> TrainingPlan.with_status(status)

    {:ok,
     %{
       count: Repo.aggregate(base, :count, :id),
       plans:
         base
         |> TrainingPlan.newest()
         |> Easy.Utils.paginate(offset, limit)
         |> TrainingPlan.with_workouts()
         |> TrainingPlan.with_plan_items()
         |> preload(:client)
         |> Repo.all()
     }}
  end

  @spec fetch_plan_item(String.t(), String.t()) :: {:ok, PlanItem.t()} | {:error, :not_found}
  def fetch_plan_item(business_id, plan_item_id) do
    PlanItem
    |> PlanItem.for_business(business_id)
    |> Repo.get(plan_item_id)
    |> ok_or_not_found()
  end

  @spec list_plan_items(String.t(), String.t()) :: {:ok, [PlanItem.t()]} | {:error, :not_found}
  def list_plan_items(business_id, plan_id) do
    with {:ok, plan} <- fetch_plan(business_id, plan_id) do
      plan_items =
        PlanItem
        |> PlanItem.for_business(business_id)
        |> PlanItem.for_plan(plan.id)
        |> PlanItem.with_workout()
        |> Repo.all()

      {:ok, plan_items}
    end
  end

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(record), do: {:ok, record}
end

defmodule EasyWeb.Coaches.TrainingPlanItemJSON do
  alias Easy.Training.PlanItem

  @spec show(map()) :: map()
  def show(%{plan_item: plan_item}) do
    %{data: data(plan_item)}
  end

  @spec index(map()) :: map()
  def index(%{plan_items: plan_items}) do
    %{data: Enum.map(plan_items, &data/1)}
  end

  defp data(%PlanItem{} = plan_item) do
    %{
      id: plan_item.id,
      day_of_week: plan_item.day_of_week,
      training_workout_id: plan_item.training_workout_id,
      training_plan_id: plan_item.training_plan_id,
      creator_id: plan_item.creator_id,
      inserted_at: plan_item.inserted_at,
      updated_at: plan_item.updated_at
    }
  end

  defp data(_), do: nil
end

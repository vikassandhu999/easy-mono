defmodule EasyWeb.Coaches.PlanItemJSON do
  alias Easy.Nutrition.PlanItem

  def show(%{plan_item: plan_item}) do
    %{data: data(plan_item)}
  end

  def index(%{plan_items: plan_items}) do
    %{data: Enum.map(plan_items, &data/1)}
  end

  defp data(%PlanItem{} = plan_item) do
    %{
      id: plan_item.id,
      day: plan_item.day,
      meal_type: plan_item.meal_type,
      meal_id: plan_item.meal_id,
      plan_id: plan_item.plan_id,
      creator_id: plan_item.creator_id,
      business_id: plan_item.business_id,
      inserted_at: plan_item.inserted_at,
      updated_at: plan_item.updated_at
    }
  end

  defp data(_), do: nil
end

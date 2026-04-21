defmodule Easy.Repo.Migrations.AddPlanItemsUniqueIndex do
  use Ecto.Migration

  def change do
    create unique_index(:plan_items, [:plan_id, :day, :meal_type],
             name: :plan_items_plan_id_day_meal_type_index
           )
  end
end

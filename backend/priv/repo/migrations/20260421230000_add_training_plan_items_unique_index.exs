defmodule Easy.Repo.Migrations.AddTrainingPlanItemsUniqueIndex do
  use Ecto.Migration

  def change do
    create unique_index(:training_plan_items, [:training_plan_id, :day, :workout_type],
             name: :training_plan_items_plan_id_day_workout_type_index
           )
  end
end

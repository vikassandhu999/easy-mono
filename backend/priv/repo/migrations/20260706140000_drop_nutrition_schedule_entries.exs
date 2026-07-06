defmodule Easy.Repo.Migrations.DropNutritionScheduleEntries do
  use Ecto.Migration

  def up do
    drop table(:nutrition_schedule_entries)
  end

  def down do
    raise "irreversible — schedule entries were replaced by nutrition_plan_days"
  end
end

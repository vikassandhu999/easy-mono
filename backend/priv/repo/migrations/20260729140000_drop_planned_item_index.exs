defmodule Easy.Repo.Migrations.DropPlannedItemIndex do
  use Ecto.Migration

  # Superseded by `nutrition_meal_item_id`. Keeping both would leave a second,
  # weaker identity for the same relationship — the exact ambiguity that made
  # position-keyed reconciliation drop entries (see RM-018).
  def up do
    alter table(:nutrition_food_log_entries) do
      remove :planned_item_index
    end
  end

  def down do
    alter table(:nutrition_food_log_entries) do
      add :planned_item_index, :integer
    end

    execute("""
    UPDATE nutrition_food_log_entries AS e
    SET planned_item_index = mi.position
    FROM nutrition_meal_items AS mi
    WHERE mi.id = e.nutrition_meal_item_id
    """)
  end
end

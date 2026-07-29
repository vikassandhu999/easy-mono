defmodule Easy.Repo.Migrations.AddMealItemIdToFoodLogEntries do
  use Ecto.Migration

  # Logging reconciliation used to key on `planned_item_index` (a copy of
  # `meal_items.position`). The builder redesign renounced position uniqueness,
  # so two items can share a position — after which logging one marked both as
  # logged and the twin never logged. Key on the item's id instead: stable,
  # unique by construction, and immune to renumbering.
  def up do
    alter table(:nutrition_food_log_entries) do
      add :nutrition_meal_item_id,
          references(:nutrition_meal_items, type: :binary_id, on_delete: :nilify_all)
    end

    create index(:nutrition_food_log_entries, [:nutrition_meal_item_id])

    # Best-effort backfill for entries already logged. Where a position is
    # ambiguous the lowest id wins — the same item the old skip-list would
    # have matched.
    execute("""
    UPDATE nutrition_food_log_entries AS e
    SET nutrition_meal_item_id = (
      SELECT mi.id
      FROM nutrition_meal_items AS mi
      JOIN nutrition_meal_logs AS ml ON ml.id = e.nutrition_meal_log_id
      WHERE mi.nutrition_meal_id = ml.nutrition_meal_id
        AND mi.position = e.planned_item_index
      ORDER BY mi.id
      LIMIT 1
    )
    WHERE e.planned_item_index IS NOT NULL
    """)
  end

  def down do
    drop index(:nutrition_food_log_entries, [:nutrition_meal_item_id])

    alter table(:nutrition_food_log_entries) do
      remove :nutrition_meal_item_id
    end
  end
end

defmodule Easy.Repo.Migrations.RequireFrozenPlannedItemIdentity do
  use Ecto.Migration

  def up do
    execute """
    UPDATE nutrition_diary_frozen_planned_items
    SET source_meal_item_id = id
    WHERE source_meal_item_id IS NULL
    """

    alter table(:nutrition_diary_frozen_planned_items) do
      modify :source_meal_item_id, :uuid, null: false
    end
  end

  def down do
    alter table(:nutrition_diary_frozen_planned_items) do
      modify :source_meal_item_id, :uuid, null: true
    end
  end
end

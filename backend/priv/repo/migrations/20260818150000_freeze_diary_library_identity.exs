defmodule Easy.Repo.Migrations.FreezeDiaryLibraryIdentity do
  use Ecto.Migration

  def change do
    alter table(:nutrition_diary_frozen_planned_items) do
      add :source_food_id, :binary_id
      add :source_recipe_id, :binary_id
    end

    alter table(:nutrition_diary_entries) do
      add :source_food_id, :binary_id
      add :source_recipe_id, :binary_id
    end

    execute(
      """
      UPDATE nutrition_diary_frozen_planned_items
      SET source_food_id = food_id, source_recipe_id = recipe_id
      """,
      """
      UPDATE nutrition_diary_frozen_planned_items
      SET source_food_id = NULL, source_recipe_id = NULL
      """
    )

    execute(
      """
      UPDATE nutrition_diary_entries
      SET source_food_id = food_id, source_recipe_id = recipe_id
      """,
      """
      UPDATE nutrition_diary_entries
      SET source_food_id = NULL, source_recipe_id = NULL
      """
    )
  end
end

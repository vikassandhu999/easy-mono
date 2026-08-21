defmodule Easy.Repo.Migrations.ProtectFrozenDiaryIdentity do
  use Ecto.Migration

  def up do
    alter table(:nutrition_diary_frozen_options) do
      modify :source_meal_id, :binary_id, null: false
    end

    create constraint(
             :nutrition_diary_frozen_planned_items,
             :nutrition_diary_frozen_planned_items_source_identity_check,
             check: source_identity_check()
           )

    create constraint(
             :nutrition_diary_entries,
             :nutrition_diary_entries_source_identity_check,
             check: source_identity_check()
           )
  end

  def down do
    drop constraint(
           :nutrition_diary_entries,
           :nutrition_diary_entries_source_identity_check
         )

    drop constraint(
           :nutrition_diary_frozen_planned_items,
           :nutrition_diary_frozen_planned_items_source_identity_check
         )

    alter table(:nutrition_diary_frozen_options) do
      modify :source_meal_id, :binary_id, null: true
    end
  end

  defp source_identity_check do
    """
    (kind = 'food' AND source_food_id IS NOT NULL AND source_recipe_id IS NULL)
    OR
    (kind = 'recipe' AND source_recipe_id IS NOT NULL AND source_food_id IS NULL)
    """
  end
end

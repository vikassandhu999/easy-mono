defmodule Easy.Repo.Migrations.DetachFrozenMenuItemIdentity do
  use Ecto.Migration

  def up do
    drop_if_exists constraint(
                     :nutrition_diary_frozen_planned_items,
                     :nutrition_diary_frozen_planned_items_source_meal_item_id_fkey
                   )
  end

  def down do
    alter table(:nutrition_diary_frozen_planned_items) do
      modify :source_meal_item_id,
             references(:nutrition_meal_items, type: :binary_id, on_delete: :nilify_all)
    end
  end
end

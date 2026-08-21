defmodule Easy.Repo.Migrations.FreezeDiaryOptionIdentity do
  use Ecto.Migration

  def change do
    alter table(:nutrition_diary_frozen_options) do
      add :source_meal_id, :binary_id
    end

    execute(
      "UPDATE nutrition_diary_frozen_options SET source_meal_id = nutrition_meal_id",
      "UPDATE nutrition_diary_frozen_options SET source_meal_id = NULL"
    )
  end
end

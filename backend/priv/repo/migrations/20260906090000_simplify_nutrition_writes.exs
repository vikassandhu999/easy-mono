defmodule Easy.Repo.Migrations.SimplifyNutritionWrites do
  use Ecto.Migration

  def up do
    drop table(:nutrition_diary_command_ledger)

    alter table(:nutrition_diary_entries) do
      remove :revision
    end

    alter table(:nutrition_recipe_ingredients) do
      add :portion_kind, :text, null: false, default: "gram"
      add :serving_label, :text
    end

    execute "UPDATE nutrition_recipe_ingredients SET amount = NULL, unit = NULL"

    create constraint(:nutrition_recipe_ingredients, :recipe_ingredient_portion_check,
             check:
               "portion_kind = 'gram' AND amount IS NULL AND unit IS NULL AND serving_label IS NULL OR portion_kind = 'serving' AND amount > 0 AND unit IS NOT NULL"
           )
  end

  def down do
    raise "Nutrition write simplification is a forward-only prototype cutover"
  end
end

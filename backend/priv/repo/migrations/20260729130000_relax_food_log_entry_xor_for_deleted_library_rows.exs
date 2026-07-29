defmodule Easy.Repo.Migrations.RelaxFoodLogEntryXorForDeletedLibraryRows do
  use Ecto.Migration

  # `food_id`/`recipe_id` on a log entry are ON DELETE SET NULL precisely so a logged
  # meal outlives the library row it came from — the entry denormalises `food_name`
  # and freezes its macros, so it stays readable forever. But the xor check demanded
  # exactly one reference at all times, so SET NULL (an UPDATE) violated it and
  # deleting any food that had ever been logged raised instead of succeeding.
  #
  # Exactly-one is a WRITE rule, not a lifetime invariant: the changeset's
  # validate_food_or_recipe/1 still requires one on insert. At rest, a history row
  # whose library row is gone may reference neither.
  #
  # nutrition_meal_items keeps the strict `= 1`: a plan row pointing at nothing is
  # meaningless, so those deletions are blocked up front as :in_use instead.
  def up do
    drop constraint(:nutrition_food_log_entries, :nutrition_food_log_entries_food_xor_recipe)

    create constraint(:nutrition_food_log_entries, :nutrition_food_log_entries_food_xor_recipe,
             check: "num_nonnulls(food_id, recipe_id) <= 1"
           )
  end

  def down do
    execute("DELETE FROM nutrition_food_log_entries WHERE food_id IS NULL AND recipe_id IS NULL")

    drop constraint(:nutrition_food_log_entries, :nutrition_food_log_entries_food_xor_recipe)

    create constraint(:nutrition_food_log_entries, :nutrition_food_log_entries_food_xor_recipe,
             check: "num_nonnulls(food_id, recipe_id) = 1"
           )
  end
end

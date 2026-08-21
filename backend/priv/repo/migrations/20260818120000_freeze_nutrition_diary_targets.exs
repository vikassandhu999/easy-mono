defmodule Easy.Repo.Migrations.FreezeNutritionDiaryTargets do
  use Ecto.Migration

  def up do
    alter table(:nutrition_diary_slots) do
      add_if_not_exists :target_calories, :float
      add_if_not_exists :target_protein_g, :float
      add_if_not_exists :target_carbs_g, :float
      add_if_not_exists :target_fat_g, :float
      add_if_not_exists :target_fiber_g, :float
    end

    execute("""
    UPDATE nutrition_diary_slots AS slot
    SET (target_calories, target_protein_g, target_carbs_g, target_fat_g, target_fiber_g) = (
      SELECT plan.target_calories,
             plan.target_protein_g,
             plan.target_carbs_g,
             plan.target_fat_g,
             plan.target_fiber_g
      FROM nutrition_diary_frozen_options AS frozen_option
      JOIN nutrition_meals AS meal ON meal.id = frozen_option.nutrition_meal_id
      JOIN nutrition_plans AS plan ON plan.id = meal.nutrition_plan_id
      WHERE frozen_option.nutrition_diary_slot_id = slot.id
      ORDER BY frozen_option.position, frozen_option.id
      LIMIT 1
    )
    WHERE slot.has_coverage = TRUE
    """)
  end

  def down do
    alter table(:nutrition_diary_slots) do
      remove_if_exists :target_calories
      remove_if_exists :target_protein_g
      remove_if_exists :target_carbs_g
      remove_if_exists :target_fat_g
      remove_if_exists :target_fiber_g
    end
  end
end

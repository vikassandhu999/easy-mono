defmodule Easy.Repo.Migrations.HardenNutritionLogging do
  use Ecto.Migration

  def up do
    alter table(:nutrition_food_log_entries) do
      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all)
    end

    execute("""
    UPDATE nutrition_food_log_entries AS entry
    SET business_id = meal_log.business_id
    FROM nutrition_meal_logs AS meal_log
    WHERE entry.nutrition_meal_log_id = meal_log.id
    """)

    execute("ALTER TABLE nutrition_food_log_entries ALTER COLUMN business_id SET NOT NULL")

    create index(:nutrition_food_log_entries, [:business_id])

    # Recipes without a cooked weight are sized in servings, so a logged recipe
    # entry can carry `amount` and no grams — the same rule meal items follow.
    alter table(:nutrition_food_log_entries) do
      modify :weight_g, :float, null: true
    end

    drop constraint(:nutrition_food_log_entries, :nutrition_food_log_entries_weight_positive)

    create constraint(:nutrition_food_log_entries, :nutrition_food_log_entries_weight_positive,
             check: "weight_g is null or weight_g > 0"
           )

    create constraint(:nutrition_food_log_entries, :nutrition_food_log_entries_source_check,
             check: "source in ('planned','replacement','unplanned')"
           )

    alter table(:nutrition_meal_logs) do
      modify :business_id,
             references(:businesses, type: :binary_id, on_delete: :delete_all),
             from: references(:businesses, type: :binary_id, on_delete: :nothing)
    end

    create constraint(:nutrition_meal_logs, :nutrition_meal_logs_meal_slot_check,
             check:
               "meal_slot in ('breakfast','morning_snack','lunch','afternoon_snack','dinner','evening_snack')"
           )
  end

  def down do
    drop constraint(:nutrition_meal_logs, :nutrition_meal_logs_meal_slot_check)

    alter table(:nutrition_meal_logs) do
      modify :business_id,
             references(:businesses, type: :binary_id, on_delete: :nothing),
             from: references(:businesses, type: :binary_id, on_delete: :delete_all)
    end

    drop constraint(:nutrition_food_log_entries, :nutrition_food_log_entries_source_check)
    drop constraint(:nutrition_food_log_entries, :nutrition_food_log_entries_weight_positive)

    execute("DELETE FROM nutrition_food_log_entries WHERE weight_g IS NULL")

    alter table(:nutrition_food_log_entries) do
      modify :weight_g, :float, null: false
    end

    create constraint(:nutrition_food_log_entries, :nutrition_food_log_entries_weight_positive,
             check: "weight_g > 0"
           )

    drop index(:nutrition_food_log_entries, [:business_id])

    alter table(:nutrition_food_log_entries) do
      remove :business_id
    end
  end
end

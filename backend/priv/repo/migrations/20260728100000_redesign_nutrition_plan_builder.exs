defmodule Easy.Repo.Migrations.RedesignNutritionPlanBuilder do
  use Ecto.Migration

  def up do
    alter table(:nutrition_plan_days) do
      add :weekdays, {:array, :text}, null: false, default: []
    end

    flush()

    execute("""
    UPDATE nutrition_plan_days AS d
    SET weekdays = w.days
    FROM (
      SELECT nutrition_plan_day_id, array_agg(day_of_week::text) AS days
      FROM nutrition_weekday_assignments
      GROUP BY nutrition_plan_day_id
    ) AS w
    WHERE w.nutrition_plan_day_id = d.id
    """)

    drop table(:nutrition_weekday_assignments)

    drop unique_index(:nutrition_meal_items, [:nutrition_meal_id, :position])
    create index(:nutrition_meal_items, [:nutrition_meal_id])

    drop unique_index(:nutrition_day_meals, [:nutrition_plan_day_id, :meal_slot, :position],
           name: :nutrition_day_meals_day_slot_position_index
         )

    create index(:nutrition_day_meals, [:nutrition_plan_day_id])

    alter table(:nutrition_meals) do
      remove :default_meal_slot
    end
  end

  def down do
    alter table(:nutrition_meals) do
      add :default_meal_slot, :string
    end

    drop index(:nutrition_day_meals, [:nutrition_plan_day_id])

    create unique_index(:nutrition_day_meals, [:nutrition_plan_day_id, :meal_slot, :position],
             name: :nutrition_day_meals_day_slot_position_index
           )

    drop index(:nutrition_meal_items, [:nutrition_meal_id])
    create unique_index(:nutrition_meal_items, [:nutrition_meal_id, :position])

    create table(:nutrition_weekday_assignments, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :day_of_week, :string, null: false

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :nutrition_plan_id,
          references(:nutrition_plans, type: :binary_id, on_delete: :delete_all), null: false

      add :nutrition_plan_day_id,
          references(:nutrition_plan_days, type: :binary_id, on_delete: :delete_all),
          null: false

      timestamps(type: :utc_datetime)
    end

    create unique_index(:nutrition_weekday_assignments, [:nutrition_plan_id, :day_of_week],
             name: :nutrition_weekday_assignments_plan_day_of_week_index
           )

    create index(:nutrition_weekday_assignments, [:business_id])
    create index(:nutrition_weekday_assignments, [:nutrition_plan_day_id])

    alter table(:nutrition_plan_days) do
      remove :weekdays
    end
  end
end

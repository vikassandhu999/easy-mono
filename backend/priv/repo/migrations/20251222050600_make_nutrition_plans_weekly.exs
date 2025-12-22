defmodule Easy.Repo.Migrations.MakeNutritionPlansWeekly do
  use Ecto.Migration

  def change do
    alter table(:nutrition_plans) do
      # Remove duration_weeks as plans are now weekly (like training plans)
      remove :duration_weeks, :integer

      # Add end_date to define the repeating period for assigned plans
      add :end_date, :date
    end

    # Add constraint to ensure end_date >= start_date
    create constraint(:nutrition_plans, :valid_date_range,
             check: "end_date IS NULL OR start_date IS NULL OR end_date >= start_date"
           )

    # Add constraint to ensure assigned plans have both dates
    create constraint(:nutrition_plans, :assigned_plans_have_dates,
             check: "is_template = true OR (start_date IS NOT NULL AND end_date IS NOT NULL)"
           )

    # Add meals day_number constraint to be 1-7 (weekly like training)
    create constraint(:meals, :day_number_valid_weekday,
             check: "day_number >= 1 AND day_number <= 7"
           )
  end
end

defmodule Easy.Repo.Migrations.UpdateTrainingPlansWeeklySchedule do
  use Ecto.Migration

  def change do
    # Training plans are now weekly (7 days max)
    # When assigned to a client, they repeat based on start_date and end_date

    alter table(:training_plans) do
      remove :duration_weeks
      add :start_date, :date
      add :end_date, :date
    end

    # Update planned_workouts day_number constraint to be 1-7 (days of week)
    # day_number: 1 = Monday, 2 = Tuesday, ..., 7 = Sunday
    create constraint(:planned_workouts, :day_number_valid_weekday,
             check: "day_number >= 1 AND day_number <= 7"
           )

    # Ensure end_date is after start_date when both are set
    create constraint(:training_plans, :valid_date_range,
             check: "start_date IS NULL OR end_date IS NULL OR end_date >= start_date"
           )

    # Ensure assigned plans (non-templates) have dates
    create constraint(:training_plans, :assigned_plans_have_dates,
             check: "is_template = true OR (start_date IS NOT NULL AND end_date IS NOT NULL)"
           )
  end
end

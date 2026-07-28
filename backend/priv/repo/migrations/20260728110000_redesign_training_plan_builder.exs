defmodule Easy.Repo.Migrations.RedesignTrainingPlanBuilder do
  use Ecto.Migration

  def up do
    alter table(:training_workouts) do
      add :weekdays, {:array, :text}, null: false, default: []
    end

    flush()

    execute("""
    UPDATE training_workouts AS w
    SET weekdays = s.days
    FROM (
      SELECT training_workout_id, array_agg(day_of_week::text) AS days
      FROM training_schedule_entries
      GROUP BY training_workout_id
    ) AS s
    WHERE s.training_workout_id = w.id
    """)

    # The only reference into the schedule table, and never written — dropping it
    # is what lets the table go.
    alter table(:training_sessions) do
      remove :training_schedule_entry_id
    end

    drop table(:training_schedule_entries)

    drop unique_index(:training_workout_exercises, [:training_workout_id, :position])
    create index(:training_workout_exercises, [:training_workout_id])

    alter table(:training_workout_exercises) do
      remove :superset_group_id
      remove :notes
    end

    alter table(:training_workouts) do
      remove :notes
      remove :creator_id
    end
  end

  def down do
    alter table(:training_workouts) do
      add :notes, :text
      add :creator_id, references(:coaches, type: :binary_id, on_delete: :nilify_all)
    end

    alter table(:training_workout_exercises) do
      add :superset_group_id, :string
      add :notes, :text
    end

    drop index(:training_workout_exercises, [:training_workout_id])
    create unique_index(:training_workout_exercises, [:training_workout_id, :position])

    create table(:training_schedule_entries, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :day_of_week, :string, null: false

      add :training_plan_id,
          references(:training_plans, type: :binary_id, on_delete: :delete_all),
          null: false

      add :training_workout_id,
          references(:training_workouts, type: :binary_id, on_delete: :delete_all),
          null: false

      add :creator_id, references(:coaches, type: :binary_id, on_delete: :nilify_all)

      add :business_id, references(:businesses, type: :binary_id, on_delete: :nothing),
        null: false

      timestamps(type: :utc_datetime)
    end

    create unique_index(:training_schedule_entries, [:training_plan_id, :day_of_week])
    create index(:training_schedule_entries, [:business_id])

    create constraint(:training_schedule_entries, :training_schedule_entries_day_check,
             check:
               "day_of_week in ('monday','tuesday','wednesday','thursday','friday','saturday','sunday')"
           )

    alter table(:training_sessions) do
      add :training_schedule_entry_id,
          references(:training_schedule_entries, type: :binary_id, on_delete: :nilify_all)
    end

    alter table(:training_workouts) do
      remove :weekdays
    end
  end
end

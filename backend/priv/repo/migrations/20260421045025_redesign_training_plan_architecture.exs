defmodule Easy.Repo.Migrations.RedesignTrainingPlanArchitecture do
  use Ecto.Migration

  def up do
    # 1. Create training_plan_items table FIRST (before any renames)
    create table(:training_plan_items, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :day, :string, null: false
      add :workout_type, :string, null: false, default: "primary"

      add :training_plan_id,
          references(:training_plans, type: :binary_id, on_delete: :delete_all),
          null: false

      add :workout_id,
          references(:planned_workouts, type: :binary_id, on_delete: :delete_all),
          null: false

      add :business_id, references(:businesses, type: :binary_id, on_delete: :nothing),
        null: false

      add :creator_id, references(:coaches, type: :binary_id, on_delete: :nothing)

      timestamps(type: :utc_datetime_usec)
    end

    create index(:training_plan_items, [:training_plan_id])
    create index(:training_plan_items, [:workout_id])
    create index(:training_plan_items, [:business_id])

    # 2. Backfill training_plan_items from planned_workouts.day_number (BEFORE rename/drop)
    execute("""
    INSERT INTO training_plan_items (id, day, workout_type, workout_id, training_plan_id, business_id, creator_id, inserted_at, updated_at)
    SELECT
      gen_random_uuid(),
      CASE pw.day_number
        WHEN 1 THEN 'monday'
        WHEN 2 THEN 'tuesday'
        WHEN 3 THEN 'wednesday'
        WHEN 4 THEN 'thursday'
        WHEN 5 THEN 'friday'
        WHEN 6 THEN 'saturday'
        WHEN 7 THEN 'sunday'
      END,
      'primary',
      pw.id,
      pw.training_plan_id,
      pw.business_id,
      tp.author_id,
      NOW(),
      NOW()
    FROM planned_workouts pw
    JOIN training_plans tp ON tp.id = pw.training_plan_id
    """)

    # 3. Drop the day_number constraint and column from planned_workouts
    drop constraint(:planned_workouts, :day_number_valid_weekday)

    alter table(:planned_workouts) do
      remove :day_number
    end

    # 4. Rename workout_elements FK: planned_workout_id -> workout_id
    #    Drop old unique index and FK index first
    drop unique_index(:workout_elements, [:position, :planned_workout_id],
           name: :workout_elements_position_planned_workout_id_index
         )

    drop index(:workout_elements, [:planned_workout_id])

    rename table(:workout_elements), :planned_workout_id, to: :workout_id

    create index(:workout_elements, [:workout_id])

    create unique_index(:workout_elements, [:position, :workout_id],
             name: :workout_elements_position_workout_id_index
           )

    # 5. Rename workout_sessions FK: planned_workout_id -> workout_id
    drop index(:workout_sessions, [:planned_workout_id])

    rename table(:workout_sessions), :planned_workout_id, to: :workout_id

    create index(:workout_sessions, [:workout_id])

    # 6. Rename table: planned_workouts -> workouts
    rename table(:planned_workouts), to: table(:workouts)

    # 7. Update the FK reference in training_plan_items to point to new table name
    #    (Postgres FK follows the table rename automatically, no action needed)

    # 8. Change rest_days from integer[] to string[] with data migration
    #    Add new column, migrate data, drop old, rename
    alter table(:training_plans) do
      add :rest_days_new, {:array, :string}, default: [], null: false
    end

    execute("""
    UPDATE training_plans
    SET rest_days_new = (
      SELECT COALESCE(array_agg(
        CASE elem
          WHEN 1 THEN 'monday'
          WHEN 2 THEN 'tuesday'
          WHEN 3 THEN 'wednesday'
          WHEN 4 THEN 'thursday'
          WHEN 5 THEN 'friday'
          WHEN 6 THEN 'saturday'
          WHEN 7 THEN 'sunday'
        END
      ), ARRAY[]::varchar[])
      FROM unnest(rest_days) AS elem
    )
    """)

    alter table(:training_plans) do
      remove :rest_days
    end

    rename table(:training_plans), :rest_days_new, to: :rest_days
  end

  def down do
    # Reverse rest_days: string[] -> integer[]
    alter table(:training_plans) do
      add :rest_days_old, {:array, :integer}, default: [], null: false
    end

    execute("""
    UPDATE training_plans
    SET rest_days_old = (
      SELECT COALESCE(array_agg(
        CASE elem
          WHEN 'monday' THEN 1
          WHEN 'tuesday' THEN 2
          WHEN 'wednesday' THEN 3
          WHEN 'thursday' THEN 4
          WHEN 'friday' THEN 5
          WHEN 'saturday' THEN 6
          WHEN 'sunday' THEN 7
        END
      ), ARRAY[]::integer[])
      FROM unnest(rest_days) AS elem
    )
    """)

    alter table(:training_plans) do
      remove :rest_days
    end

    rename table(:training_plans), :rest_days_old, to: :rest_days

    # Rename table back: workouts -> planned_workouts
    rename table(:workouts), to: table(:planned_workouts)

    # Rename workout_sessions FK back
    drop index(:workout_sessions, [:workout_id])
    rename table(:workout_sessions), :workout_id, to: :planned_workout_id
    create index(:workout_sessions, [:planned_workout_id])

    # Rename workout_elements FK back
    drop unique_index(:workout_elements, [:position, :workout_id],
           name: :workout_elements_position_workout_id_index
         )

    drop index(:workout_elements, [:workout_id])
    rename table(:workout_elements), :workout_id, to: :planned_workout_id
    create index(:workout_elements, [:planned_workout_id])

    create unique_index(:workout_elements, [:position, :planned_workout_id],
             name: :workout_elements_position_planned_workout_id_index
           )

    # Add day_number back to planned_workouts
    alter table(:planned_workouts) do
      add :day_number, :integer, null: false, default: 1
    end

    create constraint(:planned_workouts, :day_number_valid_weekday,
             check: "day_number >= 1 AND day_number <= 7"
           )

    # Backfill day_number from training_plan_items
    execute("""
    UPDATE planned_workouts pw
    SET day_number = (
      SELECT CASE tpi.day
        WHEN 'monday' THEN 1
        WHEN 'tuesday' THEN 2
        WHEN 'wednesday' THEN 3
        WHEN 'thursday' THEN 4
        WHEN 'friday' THEN 5
        WHEN 'saturday' THEN 6
        WHEN 'sunday' THEN 7
      END
      FROM training_plan_items tpi
      WHERE tpi.workout_id = pw.id
      LIMIT 1
    )
    """)

    # Drop training_plan_items
    drop table(:training_plan_items)
  end
end

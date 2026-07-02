defmodule Easy.Repo.Migrations.CreateTraining do
  use Ecto.Migration

  def change do
    create table(:training_muscles, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string, null: false
      add :description, :text
      timestamps(type: :utc_datetime)
    end

    create unique_index(:training_muscles, [:name])

    create table(:training_equipment, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string, null: false
      add :description, :text
      timestamps(type: :utc_datetime)
    end

    create unique_index(:training_equipment, [:name])

    create table(:training_exercises, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :source, :string, null: false, default: "custom"
      add :tracking_type, :string, null: false, default: "weight_reps"
      add :name, :string, null: false
      add :description, :text
      add :instructions, :text
      add :mechanics, :string
      add :force, :string
      add :images, {:array, :string}, default: []
      add :import_id, :string

      add :creator_id, references(:coaches, type: :binary_id, on_delete: :nilify_all)
      add :business_id, references(:businesses, type: :binary_id, on_delete: :nothing)

      timestamps(type: :utc_datetime)
    end

    create unique_index(:training_exercises, [:name, :business_id])
    create index(:training_exercises, [:business_id])
    # System-exercise seeds upsert with ON CONFLICT ("import_id") WHERE import_id IS NOT NULL
    create unique_index(:training_exercises, [:import_id], where: "import_id IS NOT NULL")

    create constraint(:training_exercises, :training_exercises_source_check,
             check: "source in ('system','imported','custom')"
           )

    create constraint(:training_exercises, :training_exercises_tracking_type_check,
             check:
               "tracking_type in ('weight_reps','bodyweight_reps','weighted_bodyweight','assisted_bodyweight','reps_only','duration','weight_duration','distance_duration','weight_distance')"
           )

    create constraint(:training_exercises, :training_exercises_mechanics_check,
             check: "mechanics is null or mechanics in ('compound','isolation','isometric')"
           )

    create constraint(:training_exercises, :training_exercises_force_check,
             check: "force is null or force in ('push','pull','static')"
           )

    create table(:training_exercise_muscles, primary_key: false) do
      add :exercise_id, references(:training_exercises, type: :binary_id, on_delete: :delete_all),
        null: false

      add :muscle_id, references(:training_muscles, type: :binary_id, on_delete: :delete_all),
        null: false
    end

    create unique_index(:training_exercise_muscles, [:exercise_id, :muscle_id])

    create table(:training_exercise_equipment, primary_key: false) do
      add :exercise_id, references(:training_exercises, type: :binary_id, on_delete: :delete_all),
        null: false

      add :equipment_id,
          references(:training_equipment, type: :binary_id, on_delete: :delete_all),
          null: false
    end

    create unique_index(:training_exercise_equipment, [:exercise_id, :equipment_id])

    create table(:training_plans, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string, null: false
      add :description, :text
      add :status, :string, null: false, default: "active"
      add :start_date, :date
      add :end_date, :date

      add :creator_id, references(:coaches, type: :binary_id, on_delete: :nilify_all)

      add :business_id, references(:businesses, type: :binary_id, on_delete: :nothing),
        null: false

      add :client_id, references(:clients, type: :binary_id, on_delete: :delete_all)

      add :source_template_id,
          references(:training_plans, type: :binary_id, on_delete: :nilify_all)

      timestamps(type: :utc_datetime)
    end

    create index(:training_plans, [:business_id])
    create index(:training_plans, [:business_id, :client_id])

    execute(
      """
      ALTER TABLE training_plans
      ADD CONSTRAINT training_plans_no_overlapping_active
      EXCLUDE USING gist (
        client_id WITH =,
        daterange(start_date, end_date, '[]') WITH &&
      )
      WHERE (client_id IS NOT NULL AND status = 'active')
      """,
      "ALTER TABLE training_plans DROP CONSTRAINT training_plans_no_overlapping_active"
    )

    create table(:training_workouts, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string, null: false
      add :notes, :text

      add :training_plan_id,
          references(:training_plans, type: :binary_id, on_delete: :delete_all),
          null: false

      add :creator_id, references(:coaches, type: :binary_id, on_delete: :nilify_all)

      add :business_id, references(:businesses, type: :binary_id, on_delete: :nothing),
        null: false

      timestamps(type: :utc_datetime)
    end

    create index(:training_workouts, [:business_id])
    create index(:training_workouts, [:training_plan_id])

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

    create table(:training_workout_exercises, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :position, :integer, null: false, default: 0
      add :superset_group_id, :string
      add :notes, :text
      add :planned_sets, {:array, :jsonb}, default: []

      add :training_workout_id,
          references(:training_workouts, type: :binary_id, on_delete: :delete_all),
          null: false

      add :exercise_id, references(:training_exercises, type: :binary_id, on_delete: :nilify_all)

      add :business_id, references(:businesses, type: :binary_id, on_delete: :nothing),
        null: false

      timestamps(type: :utc_datetime)
    end

    create unique_index(:training_workout_exercises, [:training_workout_id, :position])
    create index(:training_workout_exercises, [:business_id])

    create table(:training_sessions, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :date, :date
      add :started_at, :utc_datetime
      add :ended_at, :utc_datetime
      add :state, :string, null: false, default: "active"
      add :soreness_rating, :integer
      add :notes, :text
      add :planned_snapshot, :map

      add :client_id, references(:clients, type: :binary_id, on_delete: :delete_all), null: false

      add :business_id, references(:businesses, type: :binary_id, on_delete: :nothing),
        null: false

      add :training_workout_id,
          references(:training_workouts, type: :binary_id, on_delete: :nilify_all)

      add :training_schedule_entry_id,
          references(:training_schedule_entries, type: :binary_id, on_delete: :nilify_all)

      timestamps(type: :utc_datetime)
    end

    create index(:training_sessions, [:business_id, :client_id])
    create index(:training_sessions, [:client_id, :date])

    create unique_index(:training_sessions, [:business_id, :client_id],
             where: "state = 'active'",
             name: :training_sessions_active_client_index
           )

    create constraint(:training_sessions, :training_sessions_state_check,
             check: "state in ('active','completed','discarded')"
           )

    create table(:training_performed_sets, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :exercise_name, :string
      add :set_type, :string, null: false, default: "working"
      add :position, :integer, null: false, default: 0
      add :reps, :string
      add :load_value, :decimal
      add :load_unit, :string
      add :duration_seconds, :integer
      add :distance_value, :decimal
      add :distance_unit, :string
      add :rpe, :decimal
      add :completed, :boolean, null: false, default: false
      add :notes, :text
      add :swapped_from_exercise_id, :binary_id

      add :training_session_id,
          references(:training_sessions, type: :binary_id, on_delete: :delete_all),
          null: false

      add :exercise_id, references(:training_exercises, type: :binary_id, on_delete: :nilify_all)

      add :business_id, references(:businesses, type: :binary_id, on_delete: :nothing),
        null: false

      timestamps(type: :utc_datetime)
    end

    create unique_index(:training_performed_sets, [:training_session_id, :position])
    create index(:training_performed_sets, [:training_session_id])

    create constraint(:training_performed_sets, :training_performed_sets_set_type_check,
             check: "set_type in ('working','warmup','dropset')"
           )

    create constraint(:training_performed_sets, :training_performed_sets_load_unit_check,
             check: "load_unit is null or load_unit in ('kg','lbs','bodyweight','none')"
           )

    create constraint(:training_performed_sets, :training_performed_sets_distance_unit_check,
             check: "distance_unit is null or distance_unit in ('meters','km','miles','none')"
           )
  end
end

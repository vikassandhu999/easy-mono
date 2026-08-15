defmodule Easy.Repo.Migrations.RebuildTraining do
  use Ecto.Migration

  def up do
    drop_if_exists table(:training_performed_sets)
    drop_if_exists table(:training_sessions)
    drop_if_exists table(:training_workout_schedule)
    drop_if_exists table(:training_schedule_entries)
    drop_if_exists table(:training_prescribed_exercises)
    drop_if_exists table(:training_workout_exercises)
    drop_if_exists table(:training_workouts)
    drop_if_exists table(:training_plans)

    create table(:training_plans, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :kind, :string, null: false
      add :name, :string, null: false
      add :description, :text
      add :revision, :integer, null: false, default: 1
      add :archived_at, :utc_datetime
      add :start_date, :date
      add :end_date, :date

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :creator_id, references(:users, type: :binary_id, on_delete: :nilify_all)

      add :client_id,
          references(:clients,
            type: :binary_id,
            on_delete: :delete_all,
            with: [business_id: :business_id],
            name: :training_plans_client_business_id_fkey
          )

      add :source_template_id, :binary_id

      timestamps(type: :utc_datetime)
    end

    create unique_index(:training_plans, [:id, :business_id])
    create index(:training_plans, [:business_id, :kind, :archived_at])
    create index(:training_plans, [:business_id, :client_id])

    execute("""
    ALTER TABLE training_plans
    ADD CONSTRAINT training_plans_source_template_business_id_fkey
    FOREIGN KEY (source_template_id, business_id)
    REFERENCES training_plans(id, business_id)
    ON DELETE SET NULL (source_template_id)
    """)

    create unique_index(:training_plans, [:business_id, :client_id],
             where: "kind = 'client_plan' AND archived_at IS NULL AND start_date IS NULL",
             name: :training_plans_one_incomplete_client_plan_index
           )

    create constraint(:training_plans, :training_plans_kind_check,
             check: "kind in ('template','client_plan')"
           )

    create constraint(:training_plans, :training_plans_kind_fields_check,
             check: """
             (kind = 'template' AND client_id IS NULL AND source_template_id IS NULL
               AND start_date IS NULL AND end_date IS NULL)
             OR
             (kind = 'client_plan' AND client_id IS NOT NULL)
             """
           )

    create constraint(:training_plans, :training_plans_revision_check, check: "revision > 0")

    create constraint(:training_plans, :training_plans_period_check,
             check: "start_date IS NULL OR end_date IS NULL OR start_date <= end_date"
           )

    execute(
      """
      ALTER TABLE training_plans
      ADD CONSTRAINT training_plans_no_overlapping_coverage
      EXCLUDE USING gist (
        business_id WITH =,
        client_id WITH =,
        daterange(start_date, COALESCE(end_date, 'infinity'::date), '[]') WITH &&
      )
      WHERE (kind = 'client_plan' AND archived_at IS NULL AND start_date IS NOT NULL)
      """,
      "ALTER TABLE training_plans DROP CONSTRAINT training_plans_no_overlapping_coverage"
    )

    create table(:training_workouts, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string, null: false
      add :position, :integer, null: false

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :training_plan_id,
          references(:training_plans,
            type: :binary_id,
            on_delete: :delete_all,
            with: [business_id: :business_id],
            name: :training_workouts_plan_business_id_fkey
          ),
          null: false

      timestamps(type: :utc_datetime)
    end

    create unique_index(:training_workouts, [:id, :training_plan_id, :business_id])
    create unique_index(:training_workouts, [:id, :business_id])
    create unique_index(:training_workouts, [:training_plan_id, :position])
    create index(:training_workouts, [:business_id])

    create constraint(:training_workouts, :training_workouts_position_check,
             check: "position >= 0"
           )

    create table(:training_prescribed_exercises, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :position, :integer, null: false
      add :prescribed_sets, {:array, :jsonb}, null: false, default: []

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :training_workout_id,
          references(:training_workouts,
            type: :binary_id,
            on_delete: :delete_all,
            with: [business_id: :business_id],
            name: :training_prescribed_exercises_workout_business_id_fkey
          ),
          null: false

      add :exercise_id,
          references(:training_exercises, type: :binary_id, on_delete: :restrict),
          null: false

      timestamps(type: :utc_datetime)
    end

    create unique_index(:training_prescribed_exercises, [:training_workout_id, :position],
             name: :training_prescribed_exercises_position_index
           )

    create index(:training_prescribed_exercises, [:business_id])
    create index(:training_prescribed_exercises, [:exercise_id])

    create constraint(
             :training_prescribed_exercises,
             :training_prescribed_exercises_position_check,
             check: "position >= 0"
           )

    create table(:training_workout_schedule, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :weekday, :string, null: false

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :training_plan_id,
          references(:training_plans,
            type: :binary_id,
            on_delete: :delete_all,
            with: [business_id: :business_id],
            name: :training_workout_schedule_plan_business_id_fkey
          ),
          null: false

      add :training_workout_id,
          references(:training_workouts,
            type: :binary_id,
            on_delete: :delete_all,
            with: [training_plan_id: :training_plan_id, business_id: :business_id],
            name: :training_workout_schedule_workout_plan_business_id_fkey
          ),
          null: false

      timestamps(type: :utc_datetime)
    end

    create unique_index(:training_workout_schedule, [:training_plan_id, :weekday])
    create index(:training_workout_schedule, [:business_id])

    create constraint(:training_workout_schedule, :training_workout_schedule_weekday_check,
             check:
               "weekday in ('monday','tuesday','wednesday','thursday','friday','saturday','sunday')"
           )

    create table(:training_sessions, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :kind, :string, null: false
      add :state, :string, null: false, default: "active"
      add :date, :date, null: false
      add :started_at, :utc_datetime, null: false
      add :closed_at, :utc_datetime
      add :notes, :text
      add :soreness_rating, :integer
      add :snapshot_version, :integer
      add :prescription_snapshot, :map
      add :source_plan_id, :binary_id
      add :source_workout_id, :binary_id

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :client_id,
          references(:clients,
            type: :binary_id,
            on_delete: :delete_all,
            with: [business_id: :business_id],
            name: :training_sessions_client_business_id_fkey
          ),
          null: false

      timestamps(type: :utc_datetime)
    end

    create unique_index(:training_sessions, [:id, :business_id])
    create index(:training_sessions, [:business_id, :client_id, :started_at])

    create unique_index(:training_sessions, [:business_id, :client_id],
             where: "state = 'active'",
             name: :training_sessions_one_active_client_index
           )

    create constraint(:training_sessions, :training_sessions_kind_check,
             check: "kind in ('planned','freestyle')"
           )

    create constraint(:training_sessions, :training_sessions_state_check,
             check: "state in ('active','completed','discarded')"
           )

    create constraint(:training_sessions, :training_sessions_closing_check,
             check:
               "(state = 'active' AND closed_at IS NULL) OR (state in ('completed','discarded') AND closed_at IS NOT NULL)"
           )

    create constraint(:training_sessions, :training_sessions_snapshot_check,
             check: """
             (kind = 'planned' AND snapshot_version > 0 AND prescription_snapshot IS NOT NULL
               AND source_plan_id IS NOT NULL AND source_workout_id IS NOT NULL)
             OR
             (kind = 'freestyle' AND snapshot_version IS NULL AND prescription_snapshot IS NULL
               AND source_plan_id IS NULL AND source_workout_id IS NULL)
             """
           )

    create constraint(:training_sessions, :training_sessions_chronology_check,
             check: "closed_at IS NULL OR closed_at >= started_at"
           )

    create constraint(:training_sessions, :training_sessions_soreness_rating_check,
             check: "soreness_rating IS NULL OR soreness_rating BETWEEN 1 AND 5"
           )

    create table(:training_performed_sets, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :position, :integer, null: false
      add :exercise_name, :string, null: false
      add :snapshot_exercise_ref, :string
      add :set_type, :string, null: false, default: "working"
      add :reps, :string
      add :load_value, :decimal
      add :load_unit, :string
      add :duration_seconds, :integer
      add :distance_value, :decimal
      add :distance_unit, :string
      add :rpe, :decimal
      add :notes, :text

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :training_session_id,
          references(:training_sessions,
            type: :binary_id,
            on_delete: :delete_all,
            with: [business_id: :business_id],
            name: :training_performed_sets_session_business_id_fkey
          ),
          null: false

      add :exercise_id,
          references(:training_exercises, type: :binary_id, on_delete: :nilify_all)

      timestamps(type: :utc_datetime)
    end

    create unique_index(:training_performed_sets, [:training_session_id, :position])
    create index(:training_performed_sets, [:business_id, :training_session_id])

    create constraint(:training_performed_sets, :training_performed_sets_position_check,
             check: "position >= 0"
           )

    create constraint(:training_performed_sets, :training_performed_sets_exercise_name_check,
             check: "btrim(exercise_name) <> ''"
           )

    create constraint(:training_performed_sets, :training_performed_sets_set_type_check,
             check: "set_type in ('working','warmup','dropset')"
           )

    create constraint(:training_performed_sets, :training_performed_sets_load_unit_check,
             check: "load_unit IS NULL OR load_unit in ('kg','lbs','bodyweight','none')"
           )

    create constraint(:training_performed_sets, :training_performed_sets_distance_unit_check,
             check: "distance_unit IS NULL OR distance_unit in ('meters','km','miles','none')"
           )

    create constraint(:training_performed_sets, :training_performed_sets_rpe_check,
             check: "rpe IS NULL OR rpe BETWEEN 1 AND 10"
           )
  end

  def down do
    raise "the preproduction Training rebuild is intentionally irreversible"
  end
end

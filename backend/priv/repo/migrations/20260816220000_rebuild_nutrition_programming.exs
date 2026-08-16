defmodule Easy.Repo.Migrations.RebuildNutritionProgramming do
  use Ecto.Migration

  def up do
    execute("DELETE FROM nutrition_day_meals")
    execute("DELETE FROM nutrition_meal_items")
    execute("DELETE FROM nutrition_meals")
    execute("DELETE FROM nutrition_plan_days")
    execute("DELETE FROM nutrition_plans")

    drop_if_exists constraint(:nutrition_plans, :nutrition_plans_no_overlapping_active)

    drop_if_exists constraint(:nutrition_plans, :nutrition_plans_creator_id_fkey)
    drop_if_exists constraint(:nutrition_plans, :nutrition_plans_client_id_fkey)
    drop_if_exists constraint(:nutrition_plans, :nutrition_plans_source_template_id_fkey)
    drop_if_exists constraint(:nutrition_plans, :nutrition_plans_business_id_fkey)

    alter table(:nutrition_plans) do
      remove :tags
      remove :status
      add :kind, :string, null: false
      add :revision, :integer, null: false, default: 1
      add :archived_at, :utc_datetime
      modify :creator_id, references(:users, type: :binary_id, on_delete: :nilify_all)
    end

    execute("""
    ALTER TABLE nutrition_plans
    ADD CONSTRAINT nutrition_plans_business_id_fkey
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    """)

    execute("""
    ALTER TABLE nutrition_plans
    ADD CONSTRAINT nutrition_plans_client_business_id_fkey
    FOREIGN KEY (client_id, business_id)
    REFERENCES clients(id, business_id)
    ON DELETE CASCADE
    """)

    create unique_index(:nutrition_plans, [:id, :business_id])
    create index(:nutrition_plans, [:business_id, :kind, :archived_at])

    execute("""
    ALTER TABLE nutrition_plans
    ADD CONSTRAINT nutrition_plans_source_template_business_id_fkey
    FOREIGN KEY (source_template_id, business_id)
    REFERENCES nutrition_plans(id, business_id)
    ON DELETE SET NULL (source_template_id)
    """)

    create unique_index(:nutrition_plans, [:business_id, :client_id],
             where: "kind = 'client_plan' AND archived_at IS NULL AND start_date IS NULL",
             name: :nutrition_plans_one_incomplete_client_plan_index
           )

    create constraint(:nutrition_plans, :nutrition_plans_kind_check,
             check: "kind in ('template','client_plan')"
           )

    create constraint(:nutrition_plans, :nutrition_plans_kind_fields_check,
             check: """
             (kind = 'template' AND client_id IS NULL AND source_template_id IS NULL
               AND start_date IS NULL AND end_date IS NULL)
             OR
             (kind = 'client_plan' AND client_id IS NOT NULL)
             """
           )

    create constraint(:nutrition_plans, :nutrition_plans_revision_check, check: "revision > 0")

    create constraint(:nutrition_plans, :nutrition_plans_period_check,
             check: "start_date IS NULL OR end_date IS NULL OR start_date <= end_date"
           )

    create constraint(:nutrition_plans, :nutrition_plans_targets_check,
             check: """
             (target_calories IS NULL OR target_calories >= 0) AND
             (target_protein_g IS NULL OR target_protein_g >= 0) AND
             (target_carbs_g IS NULL OR target_carbs_g >= 0) AND
             (target_fat_g IS NULL OR target_fat_g >= 0) AND
             (target_fiber_g IS NULL OR target_fiber_g >= 0)
             """
           )

    execute(
      """
      ALTER TABLE nutrition_plans
      ADD CONSTRAINT nutrition_plans_no_overlapping_coverage
      EXCLUDE USING gist (
        business_id WITH =,
        client_id WITH =,
        daterange(start_date, COALESCE(end_date, 'infinity'::date), '[]') WITH &&
      )
      WHERE (kind = 'client_plan' AND archived_at IS NULL AND start_date IS NOT NULL)
      """,
      "ALTER TABLE nutrition_plans DROP CONSTRAINT nutrition_plans_no_overlapping_coverage"
    )

    create table(:nutrition_day_patterns, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string, null: false
      add :position, :integer, null: false

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :nutrition_plan_id,
          references(:nutrition_plans,
            type: :binary_id,
            on_delete: :delete_all,
            with: [business_id: :business_id],
            name: :nutrition_day_patterns_plan_business_id_fkey
          ),
          null: false

      timestamps(type: :utc_datetime)
    end

    create unique_index(:nutrition_day_patterns, [:id, :nutrition_plan_id, :business_id])
    create unique_index(:nutrition_day_patterns, [:id, :business_id])
    create unique_index(:nutrition_day_patterns, [:nutrition_plan_id, :position])
    create index(:nutrition_day_patterns, [:business_id])

    create constraint(:nutrition_day_patterns, :nutrition_day_patterns_position_check,
             check: "position >= 0"
           )

    create table(:nutrition_week_schedule, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :weekday, :string, null: false

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :nutrition_plan_id,
          references(:nutrition_plans,
            type: :binary_id,
            on_delete: :delete_all,
            with: [business_id: :business_id],
            name: :nutrition_week_schedule_plan_business_id_fkey
          ),
          null: false

      add :nutrition_day_pattern_id,
          references(:nutrition_day_patterns,
            type: :binary_id,
            on_delete: :delete_all,
            with: [nutrition_plan_id: :nutrition_plan_id, business_id: :business_id],
            name: :nutrition_week_schedule_pattern_plan_business_id_fkey
          ),
          null: false

      timestamps(type: :utc_datetime)
    end

    create unique_index(:nutrition_week_schedule, [:nutrition_plan_id, :weekday])
    create index(:nutrition_week_schedule, [:business_id])

    create constraint(:nutrition_week_schedule, :nutrition_week_schedule_weekday_check,
             check:
               "weekday in ('monday','tuesday','wednesday','thursday','friday','saturday','sunday')"
           )

    create index(:nutrition_plans, [:business_id, :client_id, :start_date, :end_date],
             where: "kind = 'client_plan' AND archived_at IS NULL AND start_date IS NOT NULL",
             name: :nutrition_plans_active_client_coverage_index
           )
  end

  def down do
    drop_if_exists index(:nutrition_plans, [:business_id, :client_id, :start_date, :end_date],
                     name: :nutrition_plans_active_client_coverage_index
                   )

    drop table(:nutrition_week_schedule)
    drop table(:nutrition_day_patterns)

    execute("DELETE FROM nutrition_plans")

    drop_if_exists constraint(:nutrition_plans, :nutrition_plans_no_overlapping_coverage)
    drop_if_exists constraint(:nutrition_plans, :nutrition_plans_targets_check)
    drop_if_exists constraint(:nutrition_plans, :nutrition_plans_period_check)
    drop_if_exists constraint(:nutrition_plans, :nutrition_plans_revision_check)
    drop_if_exists constraint(:nutrition_plans, :nutrition_plans_kind_fields_check)
    drop_if_exists constraint(:nutrition_plans, :nutrition_plans_kind_check)

    drop_if_exists index(:nutrition_plans, [:business_id, :client_id],
                     name: :nutrition_plans_one_incomplete_client_plan_index
                   )

    drop_if_exists constraint(:nutrition_plans, :nutrition_plans_source_template_business_id_fkey)
    drop_if_exists index(:nutrition_plans, [:business_id, :kind, :archived_at])
    drop_if_exists index(:nutrition_plans, [:id, :business_id])
    drop_if_exists constraint(:nutrition_plans, :nutrition_plans_client_business_id_fkey)
    drop_if_exists constraint(:nutrition_plans, :nutrition_plans_business_id_fkey)
    drop_if_exists constraint(:nutrition_plans, :nutrition_plans_creator_id_fkey)

    alter table(:nutrition_plans) do
      remove :kind
      remove :revision
      remove :archived_at
      add :tags, {:array, :string}, default: []
      add :status, :string, null: false, default: "active"
      modify :creator_id, references(:coaches, type: :binary_id, on_delete: :nilify_all)
    end

    execute("""
    ALTER TABLE nutrition_plans
    ADD CONSTRAINT nutrition_plans_business_id_fkey
    FOREIGN KEY (business_id) REFERENCES businesses(id)
    """)

    execute("""
    ALTER TABLE nutrition_plans
    ADD CONSTRAINT nutrition_plans_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    """)

    execute("""
    ALTER TABLE nutrition_plans
    ADD CONSTRAINT nutrition_plans_source_template_id_fkey
    FOREIGN KEY (source_template_id) REFERENCES nutrition_plans(id) ON DELETE SET NULL
    """)
  end
end

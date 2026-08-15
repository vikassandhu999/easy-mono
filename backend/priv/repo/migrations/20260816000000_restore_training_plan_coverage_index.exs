defmodule Easy.Repo.Migrations.RestoreTrainingPlanCoverageIndex do
  use Ecto.Migration

  def up do
    create index(:training_plans, [:business_id, :client_id, :start_date, :end_date],
             where: "kind = 'client_plan' AND archived_at IS NULL AND start_date IS NOT NULL",
             name: :training_plans_active_client_coverage_index
           )
  end

  def down do
    drop_if_exists index(:training_plans, [:business_id, :client_id, :start_date, :end_date],
                     name: :training_plans_active_client_coverage_index
                   )
  end
end

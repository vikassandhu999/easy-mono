defmodule Easy.Repo.Migrations.AddRestDaysToTrainingPlans do
  use Ecto.Migration

  def change do
    alter table(:training_plans) do
      add :rest_days, {:array, :integer}, default: [], null: false
    end
  end
end

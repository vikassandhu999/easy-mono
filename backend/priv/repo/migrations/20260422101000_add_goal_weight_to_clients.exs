defmodule Easy.Repo.Migrations.AddGoalWeightToClients do
  use Ecto.Migration

  def change do
    alter table(:clients) do
      add :goal_weight_value, :decimal, precision: 5, scale: 2
      add :goal_weight_unit, :string
    end
  end
end

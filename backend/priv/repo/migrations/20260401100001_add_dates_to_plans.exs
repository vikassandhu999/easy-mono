defmodule Easy.Repo.Migrations.AddDatesToPlans do
  use Ecto.Migration

  def change do
    alter table(:plans) do
      add :start_date, :date
      add :end_date, :date
    end
  end
end

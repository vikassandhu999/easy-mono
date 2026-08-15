defmodule Easy.Repo.Migrations.CreateWorkbenchQueueSnoozes do
  use Ecto.Migration

  def change do
    create table(:workbench_queue_snoozes, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :queue, :string, null: false
      add :snoozed_until, :date, null: false

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :client_id, references(:clients, type: :binary_id, on_delete: :delete_all), null: false

      timestamps(type: :utc_datetime)
    end

    create unique_index(:workbench_queue_snoozes, [:business_id, :client_id, :queue])

    create constraint(:workbench_queue_snoozes, :workbench_queue_snoozes_queue_check,
             check: "queue IN ('quiet', 'expiring')"
           )
  end
end

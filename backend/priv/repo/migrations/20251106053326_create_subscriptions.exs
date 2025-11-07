defmodule Easy.Repo.Migrations.CreateSubscriptions do
  use Ecto.Migration

  def change do
    create table(:subscriptions, primary_key: false) do
      add :id, :uuid, primary_key: true, default: fragment("gen_random_uuid()")
      add :status, :string, null: false
      add :started_at, :utc_datetime, null: false
      add :current_period_start, :utc_datetime, null: false
      add :current_period_end, :utc_datetime, null: false
      add :cancelled_at, :utc_datetime
      add :business_id, references(:businesses, type: :uuid, on_delete: :delete_all), null: false
      add :plan_id, references(:plans, type: :uuid, on_delete: :nothing), null: false

      timestamps()
    end

    create index(:subscriptions, [:business_id])

    create unique_index(:subscriptions, [:business_id],
             where: "status = 'active'",
             name: :subscriptions_business_active_index
           )
  end
end

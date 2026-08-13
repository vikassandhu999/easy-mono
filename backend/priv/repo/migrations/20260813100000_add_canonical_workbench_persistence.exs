defmodule Easy.Repo.Migrations.AddCanonicalWorkbenchPersistence do
  use Ecto.Migration

  def up do
    alter table(:clients) do
      add :joined_at, :utc_datetime_usec
      add :required_services, {:array, :string}, null: false, default: []
    end

    create constraint(:clients, :clients_required_services_check,
             check: """
             required_services = ARRAY[]::varchar[] OR
             required_services = ARRAY['training']::varchar[] OR
             required_services = ARRAY['nutrition']::varchar[] OR
             required_services = ARRAY['training', 'nutrition']::varchar[]
             """
           )

    alter table(:conversations) do
      add :waiting_since, :utc_datetime_usec
    end

    create index(:conversations, [:business_id, :waiting_since, :id],
             where: "waiting_since IS NOT NULL",
             name: :conversations_waiting_since_index
           )

    create index(:training_plans, [:business_id, :client_id, :start_date, :end_date],
             where: "status = 'active' AND client_id IS NOT NULL",
             name: :training_plans_active_client_coverage_index
           )

    create index(:nutrition_plans, [:business_id, :client_id, :start_date, :end_date],
             where: "status = 'active' AND client_id IS NOT NULL",
             name: :nutrition_plans_active_client_coverage_index
           )

    drop index(:clients, [:subscription_ends_on],
           name: :clients_active_subscription_ends_on_index
         )

    create index(:clients, [:business_id, :subscription_ends_on, :id],
             where: "status = 'active' AND subscription_ends_on IS NOT NULL",
             name: :clients_active_subscription_ends_on_index
           )
  end

  def down do
    drop_if_exists index(:clients, [:business_id, :subscription_ends_on, :id],
                     name: :clients_active_subscription_ends_on_index
                   )

    create index(:clients, [:subscription_ends_on],
             where: "status = 'active' AND subscription_ends_on IS NOT NULL",
             name: :clients_active_subscription_ends_on_index
           )

    drop_if_exists index(:nutrition_plans, [:business_id, :client_id, :start_date, :end_date],
                     name: :nutrition_plans_active_client_coverage_index
                   )

    drop_if_exists index(:training_plans, [:business_id, :client_id, :start_date, :end_date],
                     name: :training_plans_active_client_coverage_index
                   )

    drop_if_exists index(:conversations, [:business_id, :waiting_since, :id],
                     name: :conversations_waiting_since_index
                   )

    drop_if_exists constraint(:clients, :clients_required_services_check)

    alter table(:conversations) do
      remove :waiting_since
    end

    alter table(:clients) do
      remove :required_services
      remove :joined_at
    end
  end
end

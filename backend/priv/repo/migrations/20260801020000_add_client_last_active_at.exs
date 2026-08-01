defmodule Easy.Repo.Migrations.AddClientLastActiveAt do
  use Ecto.Migration

  def up do
    alter table(:clients) do
      add :last_active_at, :utc_datetime
    end

    create index(
             :clients,
             [:business_id, desc_nulls_last: :last_active_at, desc: :inserted_at, desc: :id],
             name: :clients_last_active_at_index
           )

    drop index(:training_sessions, [:business_id, :client_id, :date],
           name: :training_sessions_last_activity_index
         )

    drop index(:nutrition_meal_logs, [:business_id, :client_id, :date],
           name: :nutrition_meal_logs_last_activity_index
         )
  end

  def down do
    create index(:nutrition_meal_logs, [:business_id, :client_id, :date],
             where: "logged_calories > 0",
             name: :nutrition_meal_logs_last_activity_index
           )

    create index(:training_sessions, [:business_id, :client_id, :date],
             where: "state = 'completed' AND date IS NOT NULL",
             name: :training_sessions_last_activity_index
           )

    drop index(
           :clients,
           [:business_id, desc_nulls_last: :last_active_at, desc: :inserted_at, desc: :id],
           name: :clients_last_active_at_index
         )

    alter table(:clients) do
      remove :last_active_at
    end
  end
end

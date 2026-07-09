defmodule Easy.Repo.Migrations.StreamlineClientLifecycle do
  use Ecto.Migration

  def up do
    alter table(:clients) do
      add :stage, :string, null: false, default: "onboarding"
      add :inactive_reason, :string
      add :subscription_started_on, :date
      add :subscription_ends_on, :date
    end

    execute """
    UPDATE clients SET status = 'inactive', inactive_reason = 'manual'
    WHERE status = 'archived'
    """

    execute """
    UPDATE clients SET status = 'inactive', inactive_reason = 'awaiting_seat'
    WHERE status = 'awaiting_seat'
    """

    execute """
    UPDATE clients SET stage = 'coaching'
    WHERE EXISTS (SELECT 1 FROM training_plans tp WHERE tp.client_id = clients.id)
       OR EXISTS (SELECT 1 FROM nutrition_plans np WHERE np.client_id = clients.id)
    """

    create index(:clients, [:subscription_ends_on],
             where: "status = 'active' AND subscription_ends_on IS NOT NULL",
             name: :clients_active_subscription_ends_on_index
           )
  end

  def down do
    drop index(:clients, [:subscription_ends_on],
           name: :clients_active_subscription_ends_on_index
         )

    execute """
    UPDATE clients SET status = 'awaiting_seat'
    WHERE status = 'inactive' AND inactive_reason = 'awaiting_seat'
    """

    alter table(:clients) do
      remove :stage
      remove :inactive_reason
      remove :subscription_started_on
      remove :subscription_ends_on
    end
  end
end

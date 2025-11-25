defmodule Easy.Repo.Migrations.AddTrialFieldsToSubscriptions do
  use Ecto.Migration

  def change do
    alter table(:subscriptions) do
      add :trial_start, :utc_datetime
      add :trial_end, :utc_datetime
      add :trial_used, :boolean, default: false, null: false
    end

    # Add index for querying active trials
    create index(:subscriptions, [:business_id, :trial_end])
  end
end

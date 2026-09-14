defmodule Easy.Repo.Migrations.AddCancellationRequestedAt do
  use Ecto.Migration

  def change do
    alter table(:business_billing) do
      add :cancellation_requested_at, :utc_datetime
    end
  end
end

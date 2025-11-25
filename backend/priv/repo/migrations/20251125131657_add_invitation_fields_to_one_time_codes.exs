defmodule Easy.Repo.Migrations.AddInvitationFieldsToOneTimeCodes do
  use Ecto.Migration

  def change do
    alter table(:one_time_codes) do
      add :token, :uuid
      add :metadata, :map, default: %{}
      add :attempts, :integer, default: 0
      add :used_at, :utc_datetime
    end
  end
end

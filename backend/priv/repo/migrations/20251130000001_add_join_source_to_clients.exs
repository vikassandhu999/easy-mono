defmodule Easy.Repo.Migrations.AddJoinSourceToClients do
  use Ecto.Migration

  def change do
    alter table(:clients) do
      # Track how client joined: "email_invite", "public_link", "manual"
      add :join_source, :string, default: "email_invite"
    end

    # Index for filtering/analytics by join source
    create index(:clients, [:join_source])
  end
end

defmodule Easy.Repo.Migrations.AddInvitationTokenToClients do
  use Ecto.Migration

  def change do
    alter table(:clients) do
      add :invitation_token, :string
      add :invitation_expires_at, :utc_datetime
    end

    create unique_index(:clients, [:invitation_token], where: "invitation_token IS NOT NULL")
    create unique_index(:clients, [:email, :business_id], name: :clients_email_business_index)
  end
end

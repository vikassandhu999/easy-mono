defmodule Easy.Repo.Migrations.AddUniqueIndexOnClientInvitationToken do
  use Ecto.Migration

  def change do
    create unique_index(:clients, [:invitation_token],
             where: "invitation_token IS NOT NULL",
             name: :clients_invitation_token_index
           )
  end
end

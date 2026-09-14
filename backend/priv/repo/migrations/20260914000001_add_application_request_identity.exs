defmodule Easy.Repo.Migrations.AddApplicationRequestIdentity do
  use Ecto.Migration

  def change do
    alter table(:prospects) do
      add :application_request_id, :uuid
      add :application_fingerprint, :binary
    end

    create unique_index(:prospects, [:business_id, :landing_page_id, :application_request_id])
  end
end

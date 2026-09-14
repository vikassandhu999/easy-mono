defmodule Easy.Repo.Migrations.AddProspectReviewRevision do
  use Ecto.Migration

  def change do
    alter table(:prospects) do
      add :revision, :integer, default: 1, null: false
    end

    create constraint(:prospects, :prospects_revision_check, check: "revision > 0")
    create index(:prospects, [:business_id, :inserted_at, :id])
    create index(:prospects, [:business_id, :status, :inserted_at, :id])
  end
end

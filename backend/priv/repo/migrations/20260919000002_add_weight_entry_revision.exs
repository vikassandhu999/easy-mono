defmodule Easy.Repo.Migrations.AddWeightEntryRevision do
  use Ecto.Migration

  def change do
    alter table(:weight_entries) do
      add :revision, :integer, null: false, default: 1
    end

    create constraint(:weight_entries, :weight_entries_positive_revision, check: "revision > 0")
  end
end

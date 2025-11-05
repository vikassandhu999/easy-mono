defmodule Easy.Repo.Migrations.RenameUserMetadataToSettings do
  use Ecto.Migration

  def up do
    # Rename column
    rename table(:users), :raw_user_meta_data, to: :settings
  end

  def down do
    # Rollback: rename back to original
    rename table(:users), :settings, to: :raw_user_meta_data
  end
end

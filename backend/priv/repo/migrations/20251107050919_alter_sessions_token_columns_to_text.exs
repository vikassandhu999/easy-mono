defmodule Easy.Repo.Migrations.AlterSessionsTokenColumnsToText do
  use Ecto.Migration

  def up do
    # Change token and refresh_token columns from varchar(255) to text
    # to accommodate JWT tokens which can exceed 255 characters
    alter table(:sessions) do
      modify :token, :text, null: false
      modify :refresh_token, :text, null: false
    end
  end

  def down do
    # Revert back to varchar(255) if needed
    # Note: This will fail if any tokens are longer than 255 characters
    alter table(:sessions) do
      modify :token, :string, null: false
      modify :refresh_token, :string, null: false
    end
  end
end

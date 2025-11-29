defmodule Easy.Repo.Migrations.CreateBusinessSettings do
  use Ecto.Migration

  def change do
    create table(:business_settings, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      # Public Join Settings
      add :public_join_enabled, :boolean, default: false, null: false
      add :public_join_approval_required, :boolean, default: true, null: false
      add :public_join_code, :string
      add :public_join_client_limit, :integer

      # Public Page Branding
      add :tagline, :string
      add :cover_image_url, :string
      add :accent_color, :string

      timestamps()
    end

    # Each business can have only one settings record
    create unique_index(:business_settings, [:business_id])

    # Public join code must be unique across all businesses
    create unique_index(:business_settings, [:public_join_code],
             where: "public_join_code IS NOT NULL"
           )
  end
end

defmodule Easy.Repo.Migrations.CreateStoreProfiles do
  use Ecto.Migration

  def change do
    create table(:store_profiles, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :slug, :string, null: false
      add :display_name, :string, null: false
      add :bio, :text
      add :photo_url, :string
      add :cover_image_url, :string
      add :social_links, :map, default: %{}
      add :theme_color, :string, default: "orange"
      add :is_published, :boolean, default: false, null: false
      add :intake_questions, {:array, :map}, default: []

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      timestamps(type: :utc_datetime)
    end

    create unique_index(:store_profiles, [:slug])
    create unique_index(:store_profiles, [:business_id])
  end
end

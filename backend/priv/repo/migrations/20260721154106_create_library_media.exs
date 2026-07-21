defmodule Easy.Repo.Migrations.CreateLibraryMedia do
  use Ecto.Migration

  def change do
    create table(:library_media, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :uploaded_by_type, :string
      add :uploaded_by_id, :binary_id
      add :storage_key, :string, null: false
      add :content_type, :string, null: false
      add :byte_size, :bigint, null: false

      timestamps(type: :utc_datetime)
    end

    create unique_index(:library_media, [:storage_key])
    create index(:library_media, [:business_id])

    alter table(:training_exercises) do
      add :media_id, references(:library_media, type: :binary_id, on_delete: :nilify_all)
    end

    alter table(:nutrition_foods) do
      add :media_id, references(:library_media, type: :binary_id, on_delete: :nilify_all)
    end

    create index(:training_exercises, [:media_id])
    create index(:nutrition_foods, [:media_id])

    # A system-owned record (no business) can never reference business-owned media.
    create constraint(:training_exercises, :training_exercises_business_media_check,
             check: "business_id IS NOT NULL OR media_id IS NULL"
           )

    create constraint(:nutrition_foods, :nutrition_foods_business_media_check,
             check: "business_id IS NOT NULL OR media_id IS NULL"
           )
  end
end

defmodule Easy.Repo.Migrations.CreateMedia do
  use Ecto.Migration

  def change do
    create table(:attachments, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :uploaded_by_type, :string, null: false
      add :uploaded_by_id, :binary_id, null: false
      add :storage_key, :string, null: false
      add :content_type, :string, null: false
      add :byte_size, :bigint, null: false

      add :client_id,
          references(:clients,
            type: :binary_id,
            with: [business_id: :business_id],
            name: :attachments_client_business_id_fkey,
            on_delete: :delete_all
          ),
          null: false

      add :duration_ms, :integer

      timestamps(type: :utc_datetime)
    end

    create unique_index(:attachments, [:id, :business_id])
    create unique_index(:attachments, [:storage_key])

    create constraint(:attachments, :attachments_duration_ms_check,
             check: "duration_ms IS NULL OR duration_ms BETWEEN 1 AND 300000"
           )

    create constraint(:attachments, :attachments_uploaded_by_type_check,
             check: "uploaded_by_type in ('coach','client','system')"
           )

    create table(:library_media, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all)
      add :uploaded_by_type, :string
      add :uploaded_by_id, :binary_id
      add :storage_key, :string
      add :content_type, :string
      add :byte_size, :bigint
      add :external_url, :text

      timestamps(type: :utc_datetime)
    end

    create index(:library_media, [:business_id])
    create unique_index(:library_media, [:storage_key])

    create constraint(:library_media, :library_media_source_check,
             check: """
             ((external_url IS NOT NULL AND external_url ~ '^https?://' AND storage_key IS NULL AND uploaded_by_type = 'system')
             OR (external_url IS NULL AND storage_key IS NOT NULL AND business_id IS NOT NULL
                 AND content_type IS NOT NULL AND byte_size > 0)) IS TRUE
             """
           )
  end
end

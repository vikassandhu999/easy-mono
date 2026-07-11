defmodule Easy.Repo.Migrations.CreateAttachments do
  use Ecto.Migration

  def change do
    create table(:attachments, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :uploaded_by_type, :string, null: false
      add :uploaded_by_id, :binary_id, null: false
      add :storage_key, :string, null: false
      add :content_type, :string, null: false
      add :byte_size, :bigint, null: false
      add :purpose, :string, null: false

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :client_id,
          references(:clients,
            type: :binary_id,
            on_delete: :delete_all,
            with: [business_id: :business_id],
            name: :attachments_client_business_id_fkey
          ),
          null: false

      timestamps(type: :utc_datetime)
    end

    create constraint(:attachments, :attachments_uploaded_by_type_check,
             check: "uploaded_by_type in ('coach','client','system')"
           )

    create constraint(:attachments, :attachments_purpose_check,
             check: "purpose in ('check_in_photo')"
           )

    create unique_index(:attachments, [:storage_key])
    create index(:attachments, [:business_id, :client_id, :purpose])
  end
end

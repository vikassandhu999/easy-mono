defmodule Easy.Repo.Migrations.AddTrainingSetRequests do
  use Ecto.Migration

  def change do
    create table(:training_set_requests, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :request_id, :binary_id, null: false
      add :fingerprint, :binary, null: false

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :training_session_id,
          references(:training_sessions,
            type: :binary_id,
            with: [business_id: :business_id],
            on_delete: :delete_all,
            name: :training_set_requests_session_business_id_fkey
          ),
          null: false

      add :performed_set_id,
          references(:training_performed_sets,
            type: :binary_id,
            with: [business_id: :business_id, training_session_id: :training_session_id],
            on_delete: {:nilify, [:performed_set_id]},
            name: :training_set_requests_set_scope_fkey
          )

      timestamps(type: :utc_datetime)
    end

    create unique_index(:training_set_requests, [:business_id, :training_session_id, :request_id],
             name: :training_set_requests_identity_index
           )

    create index(:training_set_requests, [:performed_set_id])
  end
end

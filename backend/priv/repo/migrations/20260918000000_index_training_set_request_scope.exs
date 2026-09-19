defmodule Easy.Repo.Migrations.IndexTrainingSetRequestScope do
  use Ecto.Migration

  @disable_ddl_transaction true
  @disable_migration_lock true

  def change do
    create unique_index(:training_performed_sets, [:id, :business_id, :training_session_id],
             name: :training_performed_sets_request_scope_index,
             concurrently: true
           )
  end
end

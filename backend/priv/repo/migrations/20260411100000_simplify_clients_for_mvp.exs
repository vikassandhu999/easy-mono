defmodule Easy.Repo.Migrations.SimplifyClientsForMvp do
  use Ecto.Migration

  def up do
    # Convert any existing expired status to inactive (expired is removed from MVP)
    execute("UPDATE clients SET status = 'inactive' WHERE status = 'expired'")

    # Clear status_override — MVP uses direct status, no override mechanism
    execute("UPDATE clients SET status_override = NULL WHERE status_override IS NOT NULL")

    # Drop indexes on columns being removed
    drop_if_exists index(:clients, [:offer_id])

    alter table(:clients) do
      remove :instagram_handle
      remove :program_name
      remove :program_start
      remove :program_end
      remove :payment_status
      remove :payment_amount
      remove :payment_currency
      remove :payment_notes
      remove :intake_answers
      remove :source
      remove :offer_id
      remove :status_override
    end
  end

  def down do
    alter table(:clients) do
      add :instagram_handle, :string
      add :program_name, :string
      add :program_start, :date
      add :program_end, :date
      add :payment_status, :string
      add :payment_amount, :integer
      add :payment_currency, :string, default: "INR"
      add :payment_notes, :string
      add :intake_answers, :map, default: %{}
      add :offer_id, references(:offers, type: :binary_id, on_delete: :nilify_all)
      add :source, :string
      add :status_override, :string
    end

    create index(:clients, [:offer_id])
  end
end

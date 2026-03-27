defmodule Easy.Repo.Migrations.EnrichClients do
  use Ecto.Migration

  def change do
    alter table(:clients) do
      # Contact
      add :instagram_handle, :string

      # Program tracking
      add :program_name, :string
      add :program_start, :date
      add :program_end, :date

      # Payment tracking
      add :payment_status, :string
      add :payment_amount, :integer
      add :payment_currency, :string, default: "INR"
      add :payment_notes, :string

      # Intake (from leads)
      add :intake_answers, :map, default: %{}
      add :offer_id, references(:offers, type: :binary_id, on_delete: :nilify_all)
      add :source, :string

      # Status override (bypasses auto-computation when set)
      add :status_override, :string
    end

    create index(:clients, [:business_id, :status])
    create index(:clients, [:offer_id])
  end
end

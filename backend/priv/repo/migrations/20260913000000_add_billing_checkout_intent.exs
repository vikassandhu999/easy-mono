defmodule Easy.Repo.Migrations.AddBillingCheckoutIntent do
  use Ecto.Migration

  def change do
    create table(:billing_checkout_intents, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :request_id, :uuid, null: false
      add :target_quantity, :integer, null: false
      add :kind, :string, null: false
      add :status, :string, null: false
      add :subscription_id, :string

      timestamps(type: :utc_datetime)
    end

    create unique_index(:billing_checkout_intents, [:business_id, :request_id])

    create unique_index(:billing_checkout_intents, [:business_id],
             where: "status IN ('pending', 'unknown')"
           )
  end
end

defmodule Easy.Repo.Migrations.AddBillingCancellationState do
  use Ecto.Migration

  def change do
    alter table(:business_billing) do
      add :cancellation_state, :string
    end

    create constraint(:business_billing, :business_billing_cancellation_state,
             check:
               "cancellation_state IS NULL OR cancellation_state IN ('requested', 'unknown', 'accepted')"
           )
  end
end

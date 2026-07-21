defmodule Easy.Repo.Migrations.UniqueRazorpaySubscriptionId do
  use Ecto.Migration

  # One Razorpay subscription id must identify at most one billing row — webhook
  # and sync lookups (Repo.one/FOR UPDATE) assume it. Partial so multiple rows
  # can share a NULL id before checkout.
  def up do
    drop index(:business_billing, [:razorpay_subscription_id])

    create unique_index(:business_billing, [:razorpay_subscription_id],
             where: "razorpay_subscription_id IS NOT NULL"
           )
  end

  def down do
    drop index(:business_billing, [:razorpay_subscription_id])
    create index(:business_billing, [:razorpay_subscription_id])
  end
end

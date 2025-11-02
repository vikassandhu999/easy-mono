defmodule Easy.Repo.Migrations.CreateTenantTables do
  use Ecto.Migration

  def up do
    # Create businesses table
    create table(:businesses, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :handle, :string, null: false
      add :name, :string, null: false
      add :about, :text, null: false, default: ""
      add :logo_url, :text

      add :owner_user_id, references(:users, type: :binary_id, on_delete: :delete_all),
        null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:businesses, [:handle], name: :u_idx_handle)
    create index(:businesses, [:owner_user_id], name: :idx_businesses_owner_user_id)
    create index(:businesses, [:inserted_at], name: :idx_businesses_created_at)

    # Create business_plans table
    create table(:business_plans, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string, null: false
      add :is_default, :boolean, null: false, default: false
      add :max_active_clients, :integer, null: false, default: 0

      timestamps(type: :utc_datetime_usec)
    end

    create index(:business_plans, [:is_default], name: :idx_business_plans_is_default)
    create index(:business_plans, [:inserted_at], name: :idx_business_plans_created_at)

    # Create business_plan_prices table
    create table(:business_plan_prices, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :plan_id, references(:business_plans, type: :binary_id, on_delete: :delete_all),
        null: false

      add :currency_code, :string, size: 3, null: false
      add :amount, :string, size: 50, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create index(:business_plan_prices, [:plan_id], name: :idx_business_plan_prices_plan_id)

    create index(:business_plan_prices, [:currency_code],
             name: :idx_business_plan_prices_currency_code
           )

    create unique_index(:business_plan_prices, [:plan_id, :currency_code],
             name: :idx_business_plan_prices_plan_currency
           )

    # Create business_subscriptions table
    create table(:business_subscriptions, primary_key: false) do
      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        primary_key: true

      add :plan_id, references(:business_plans, type: :binary_id), null: false
      add :max_active_clients, :integer, null: false, default: 0
      add :status, :integer, null: false, default: 1
      add :trial_start_date, :utc_datetime_usec
      add :trial_end_date, :utc_datetime_usec
      add :start_date, :utc_datetime_usec
      add :renewal_open_date, :utc_datetime_usec
      add :end_date, :utc_datetime_usec
      add :ended_at, :utc_datetime_usec, null: false, default: fragment("NOW()")
      add :ended_with_reason, :text, null: false, default: ""
      add :latest_change_id, :binary_id
      add :pending_change_id, :binary_id
      add :active_clients, :integer, null: false, default: 0

      timestamps(type: :utc_datetime_usec)
    end

    create index(:business_subscriptions, [:plan_id], name: :idx_business_subscriptions_plan_id)
    create index(:business_subscriptions, [:status], name: :idx_business_subscriptions_status)

    create index(:business_subscriptions, [:trial_end_date],
             name: :idx_business_subscriptions_trial_end_date,
             where: "trial_end_date IS NOT NULL"
           )

    create index(:business_subscriptions, [:end_date],
             name: :idx_business_subscriptions_end_date,
             where: "end_date IS NOT NULL"
           )

    create index(:business_subscriptions, [:renewal_open_date],
             name: :idx_business_subscriptions_renewal_open_date,
             where: "renewal_open_date IS NOT NULL"
           )

    create index(:business_subscriptions, [:latest_change_id],
             name: :idx_business_subscriptions_latest_change_id,
             where: "latest_change_id IS NOT NULL"
           )

    create index(:business_subscriptions, [:pending_change_id],
             name: :idx_business_subscriptions_pending_change_id,
             where: "pending_change_id IS NOT NULL"
           )

    # Create business_subscription_changes table
    create table(:business_subscription_changes, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :plan_id, references(:business_plans, type: :binary_id), null: false
      add :old_plan_id, references(:business_plans, type: :binary_id), null: false
      add :status, :integer, null: false, default: 1
      add :phase, :integer, null: false
      add :currency_code, :string, size: 3, null: false
      add :prorated_amount, :string, size: 50
      add :prorated_days, :integer
      add :billing_amount, :string, size: 50
      add :billing_days, :integer
      add :start_date, :utc_datetime_usec, null: false
      add :valid_until, :utc_datetime_usec, null: false
      add :payment_id, :binary_id

      timestamps(type: :utc_datetime_usec)
    end

    create index(:business_subscription_changes, [:business_id],
             name: :idx_business_subscription_changes_business_id
           )

    create index(:business_subscription_changes, [:plan_id],
             name: :idx_business_subscription_changes_plan_id
           )

    create index(:business_subscription_changes, [:old_plan_id],
             name: :idx_business_subscription_changes_old_plan_id
           )

    create index(:business_subscription_changes, [:status],
             name: :idx_business_subscription_changes_status
           )

    create index(:business_subscription_changes, [:phase],
             name: :idx_business_subscription_changes_phase
           )

    create index(:business_subscription_changes, [:payment_id],
             name: :idx_business_subscription_changes_payment_id,
             where: "payment_id IS NOT NULL"
           )

    create index(:business_subscription_changes, [:valid_until],
             name: :idx_business_subscription_changes_valid_until
           )

    create index(:business_subscription_changes, [:start_date],
             name: :idx_business_subscription_changes_start_date
           )

    # Add foreign key constraints for business_subscriptions referencing business_subscription_changes
    alter table(:business_subscriptions) do
      modify :latest_change_id, references(:business_subscription_changes, type: :binary_id)
      modify :pending_change_id, references(:business_subscription_changes, type: :binary_id)
    end

    # Insert default business plan
    execute """
    INSERT INTO business_plans (id, name, is_default, max_active_clients, inserted_at, updated_at)
    VALUES (gen_random_uuid(), 'Starter Plan', true, 10, NOW(), NOW())
    ON CONFLICT DO NOTHING
    """

    # Insert default pricing for the starter plan (USD)
    execute """
    INSERT INTO business_plan_prices (id, plan_id, currency_code, amount, inserted_at, updated_at)
    VALUES (
      gen_random_uuid(),
      (SELECT id FROM business_plans WHERE is_default = true LIMIT 1),
      'USD',
      '29.00',
      NOW(),
      NOW()
    )
    ON CONFLICT DO NOTHING
    """

    # Insert default pricing for the starter plan (INR)
    execute """
    INSERT INTO business_plan_prices (id, plan_id, currency_code, amount, inserted_at, updated_at)
    VALUES (
      gen_random_uuid(),
      (SELECT id FROM business_plans WHERE is_default = true LIMIT 1),
      'INR',
      '2400.00',
      NOW(),
      NOW()
    )
    ON CONFLICT DO NOTHING
    """
  end

  def down do
    # Drop foreign key constraints first
    alter table(:business_subscriptions) do
      modify :pending_change_id, :binary_id
      modify :latest_change_id, :binary_id
    end

    # Drop tables in reverse order
    drop table(:business_subscription_changes)
    drop table(:business_subscriptions)
    drop table(:business_plan_prices)
    drop table(:business_plans)
    drop table(:businesses)
  end
end

defmodule Easy.Repo.Migrations.CreateBusinessesAndCoaches do
  use Ecto.Migration

  def up do
    # ============================================
    # 1. BUSINESSES TABLE
    # ============================================
    create table(:businesses, primary_key: false) do
      add :id, :binary_id, primary_key: true

      # Core identity
      add :handle, :string, null: false
      add :name, :string, null: false
      add :about, :text
      add :logo_url, :string

      # Status
      add :status, :string, default: "early", null: false

      # Contact Info
      add :email, :string
      add :phone, :string
      add :website, :string

      # Address
      add :address_line1, :string
      add :address_line2, :string
      add :city, :string
      add :state, :string
      add :postal_code, :string
      add :country, :string, default: "IND"

      # Settings
      add :timezone, :string, default: "Asia/Kolkata"
      add :settings, :map, default: "{}"

      # Onboarding
      add :onboarded_at, :utc_datetime
      add :onboarding_step, :string

      # Relationships
      add :owner_user_id, references(:users, type: :binary_id, on_delete: :restrict), null: false

      timestamps(type: :utc_datetime)
    end

    # Indexes for businesses
    create unique_index(:businesses, [:handle])
    create index(:businesses, [:owner_user_id])
    create index(:businesses, [:status])
    create index(:businesses, [:email])

    # Check constraint: valid status
    create constraint(:businesses, :valid_status,
             check: "status IN ('early', 'trial', 'active', 'suspended', 'cancelled')"
           )

    # ============================================
    # 2. COACHES TABLE
    # ============================================
    create table(:coaches, primary_key: false) do
      add :id, :binary_id, primary_key: true

      # Profile
      add :name, :string, null: false
      add :title, :string
      add :about, :text
      add :profile_picture_url, :string

      # Contact
      add :contact_email, :string
      add :contact_phone, :string

      # Professional info
      add :specializations, {:array, :string}, default: []

      # Status
      add :is_active, :boolean, default: true, null: false

      # Social media
      add :website, :string
      add :instagram_handle, :string
      add :facebook_url, :string
      add :linkedin_url, :string
      add :twitter_handle, :string
      add :youtube_url, :string

      # Settings
      add :settings, :map, default: "{}"

      # Relationships
      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false

      timestamps(type: :utc_datetime)
    end

    # Indexes for coaches
    create index(:coaches, [:business_id])
    create index(:coaches, [:user_id])
    create index(:coaches, [:is_active])

    # Unique constraint: one coach per user per business
    create unique_index(:coaches, [:business_id, :user_id],
             name: :coaches_business_id_user_id_index
           )
  end

  def down do
    drop table(:coaches)
    drop table(:businesses)
  end
end

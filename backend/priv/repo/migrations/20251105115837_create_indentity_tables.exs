defmodule Easy.Repo.Migrations.CreateIdentityTables do
  use Ecto.Migration

  def up do
    # ============================================
    # 1. USERS TABLE (Identity/Authentication)
    # ============================================
    create table(:users, primary_key: false) do
      add :id, :binary_id, primary_key: true

      # Contact methods
      add :email, :string
      add :phone, :string

      # Confirmation timestamps
      add :email_confirmed_at, :utc_datetime
      add :phone_confirmed_at, :utc_datetime

      # Password (optional - for future use)
      add :encrypted_password, :string

      # Metadata (flexible JSON storage)
      add :raw_user_meta_data, :map, default: "{}"

      timestamps(type: :utc_datetime_usec)
    end

    # Indexes for users
    create unique_index(:users, [:email], where: "email IS NOT NULL")
    create unique_index(:users, [:phone], where: "phone IS NOT NULL")
    create index(:users, [:email_confirmed_at])
    create index(:users, [:phone_confirmed_at])

    # ============================================
    # 2. ONE_TIME_TOKENS TABLE (OTP/Verification)
    # ============================================
    create table(:one_time_tokens, primary_key: false) do
      add :id, :binary_id, primary_key: true

      # Purpose of token
      add :token_type, :string, null: false

      # TOTP secret for generating codes
      add :secret, :string, null: false

      # Expiration
      add :expires_at, :utc_datetime, null: false

      # Usage tracking
      add :used, :boolean, default: false, null: false
      add :used_at, :utc_datetime

      # Contact information
      add :relates_to_email, :string
      add :relates_to_phone, :string

      # Rate limiting
      add :attempt_count, :integer, default: 0, null: false
      add :last_attempt_at, :utc_datetime

      # Link to user (nullable for signup flow)
      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all)

      timestamps(type: :utc_datetime)
    end

    # Indexes for one_time_tokens
    create index(:one_time_tokens, [:user_id])
    create index(:one_time_tokens, [:token_type])
    create index(:one_time_tokens, [:expires_at])
    create index(:one_time_tokens, [:used])
    create index(:one_time_tokens, [:relates_to_email, :token_type, :used, :expires_at])
    create index(:one_time_tokens, [:relates_to_phone, :token_type, :used, :expires_at])

    # Check constraint: must have either email or phone
    create constraint(:one_time_tokens, :must_have_contact,
             check: "relates_to_email IS NOT NULL OR relates_to_phone IS NOT NULL"
           )

    # Check constraint: valid token types
    create constraint(:one_time_tokens, :valid_token_type,
             check:
               "token_type IN ('signup_verification', 'signin_verification', 'password_reset')"
           )

    # ============================================
    # 3. USER_SESSIONS TABLE (Session Management)
    # ============================================
    create table(:user_sessions, primary_key: false) do
      add :id, :binary_id, primary_key: true

      # Session tokens
      add :refresh_token, :string, null: false

      # Lifecycle timestamps
      add :expires_at, :utc_datetime, null: false
      add :refreshed_at, :utc_datetime
      add :revoked_at, :utc_datetime
      add :last_activity_at, :utc_datetime

      # Device information
      add :device_name, :string
      add :device_type, :string
      add :user_agent, :string
      add :ip, :string

      # Link to user
      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false

      timestamps(type: :utc_datetime)
    end

    # Indexes for user_sessions
    create unique_index(:user_sessions, [:refresh_token])
    create index(:user_sessions, [:user_id])
    create index(:user_sessions, [:expires_at])
    create index(:user_sessions, [:revoked_at])
    create index(:user_sessions, [:last_activity_at])
    create index(:user_sessions, [:user_id, :expires_at, :revoked_at])

    # Check constraint: valid device types
    create constraint(:user_sessions, :valid_device_type,
             check:
               "device_type IS NULL OR device_type IN ('mobile', 'web', 'desktop', 'tablet', 'unknown')"
           )
  end

  def down do
    drop table(:user_sessions)
    drop table(:one_time_tokens)
    drop table(:users)
  end
end

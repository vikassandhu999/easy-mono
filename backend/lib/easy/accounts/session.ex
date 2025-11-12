defmodule Easy.Accounts.Session do
  @moduledoc """
  Session schema for managing authenticated user sessions.

  Sessions store JWT token information and track session lifecycle:
  - Access tokens (JWT) for API authentication
  - Refresh tokens for obtaining new access tokens
  - Expiration and activity tracking
  - Revocation support for logout and security

  Sessions are created after successful OTP verification and can be
  refreshed using the refresh token until revoked or expired.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "sessions" do
    field :refresh_token, :string
    field :expires_at, :utc_datetime
    field :last_activity_at, :utc_datetime
    field :revoked_at, :utc_datetime

    belongs_to :user, Easy.Accounts.User
    belongs_to :business, Easy.Organizations.Business

    timestamps()
  end

  def changeset(session, attrs) do
    session
    |> cast(attrs, [
      :refresh_token,
      :expires_at,
      :last_activity_at,
      :revoked_at,
      :user_id,
      :business_id
    ])
    |> validate_required([:refresh_token, :expires_at, :last_activity_at, :user_id, :business_id])
    |> unique_constraint(:refresh_token)
    |> foreign_key_constraint(:user_id)
    |> foreign_key_constraint(:business_id)
  end

  def revoke_changeset(session) do
    change(session, revoked_at: DateTime.utc_now() |> DateTime.truncate(:second))
  end

  def update_activity_changeset(session) do
    change(session, last_activity_at: DateTime.utc_now() |> DateTime.truncate(:second))
  end

  def expired?(%__MODULE__{expires_at: expires_at}) do
    DateTime.compare(DateTime.utc_now(), expires_at) != :lt
  end

  def revoked?(%__MODULE__{revoked_at: revoked_at}) do
    not is_nil(revoked_at)
  end

  def valid?(%__MODULE__{} = session) do
    not expired?(session) and not revoked?(session)
  end
end

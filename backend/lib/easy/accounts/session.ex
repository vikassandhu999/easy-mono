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
    field :token, :string
    field :refresh_token, :string
    field :expires_at, :utc_datetime
    field :last_activity_at, :utc_datetime
    field :revoked_at, :utc_datetime

    belongs_to :user, Easy.Accounts.User

    timestamps()
  end

  @doc """
  Changeset for creating a new session.
  Validates required fields and ensures tokens are unique.
  """
  def changeset(session, attrs) do
    session
    |> cast(attrs, [:token, :refresh_token, :expires_at, :last_activity_at, :revoked_at, :user_id])
    |> validate_required([:token, :refresh_token, :expires_at, :last_activity_at, :user_id])
    |> unique_constraint(:token)
    |> unique_constraint(:refresh_token)
    |> foreign_key_constraint(:user_id)
  end

  @doc """
  Changeset for revoking a session.
  Sets revoked_at to the current timestamp.
  """
  def revoke_changeset(session) do
    change(session, revoked_at: DateTime.utc_now() |> DateTime.truncate(:second))
  end

  @doc """
  Changeset for updating last activity timestamp.
  Used to track session usage and implement idle timeout.
  """
  def update_activity_changeset(session) do
    change(session, last_activity_at: DateTime.utc_now() |> DateTime.truncate(:second))
  end

  @doc """
  Checks if the session has expired.
  Returns true if expired, false otherwise.
  """
  def expired?(%__MODULE__{expires_at: expires_at}) do
    DateTime.compare(DateTime.utc_now(), expires_at) != :lt
  end

  @doc """
  Checks if the session has been revoked.
  Returns true if revoked, false otherwise.
  """
  def revoked?(%__MODULE__{revoked_at: revoked_at}) do
    not is_nil(revoked_at)
  end

  @doc """
  Checks if the session is valid (not expired and not revoked).
  Returns true if valid, false otherwise.
  """
  def valid?(%__MODULE__{} = session) do
    not expired?(session) and not revoked?(session)
  end
end

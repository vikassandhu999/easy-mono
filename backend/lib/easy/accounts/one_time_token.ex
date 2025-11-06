defmodule Easy.Accounts.OneTimeToken do
  @moduledoc """
  One-Time Token for OTP-based authentication flows.

  Used for:
  - Email verification during coach registration
  - Login authentication
  - Client invitation acceptance

  Tokens contain:
  - A UUID token for invitation links
  - A 6-digit OTP code (hashed) for verification
  - Type to distinguish different use cases
  - Expiration and attempt tracking for security
  """

  use Ecto.Schema
  import Ecto.Changeset

  schema "one_time_tokens" do
    field :token, :string
    field :code, :string
    field :type, :string
    field :email, :string
    field :expires_at, :utc_datetime
    field :used_at, :utc_datetime
    field :attempts, :integer, default: 0
    field :metadata, :map

    belongs_to :user, Easy.Accounts.User

    timestamps()
  end

  @doc """
  Changeset for creating a new OTP token.
  Validates required fields and hashes the OTP code before storage.
  """
  def changeset(token, attrs) do
    token
    |> cast(attrs, [
      :token,
      :code,
      :type,
      :email,
      :expires_at,
      :used_at,
      :attempts,
      :metadata,
      :user_id
    ])
    |> validate_required([:token, :code, :type, :email, :expires_at])
    |> validate_format(:email, ~r/^[^\s]+@[^\s]+$/, message: "must be a valid email address")
    |> validate_inclusion(:type, ["email_verification", "login", "client_invitation"])
    |> validate_number(:attempts, greater_than_or_equal_to: 0)
    |> hash_code()
    |> unique_constraint(:token)
    |> foreign_key_constraint(:user_id)
  end

  # Hashes the OTP code using bcrypt before storing.
  # Only hashes if the code field has changed.
  defp hash_code(changeset) do
    case get_change(changeset, :code) do
      nil ->
        changeset

      code ->
        hashed_code = Bcrypt.hash_pwd_salt(code)
        put_change(changeset, :code, hashed_code)
    end
  end

  @doc """
  Verifies an OTP code against the hashed code in the token.
  Returns true if the code matches, false otherwise.
  """
  def verify_code(%__MODULE__{code: hashed_code}, code) when is_binary(code) do
    Bcrypt.verify_pass(code, hashed_code)
  end

  @doc """
  Checks if the token has expired.
  Returns true if expired, false otherwise.
  """
  def expired?(%__MODULE__{expires_at: expires_at}) do
    DateTime.compare(DateTime.utc_now(), expires_at) != :lt
  end

  @doc """
  Checks if the token has been used.
  Returns true if used, false otherwise.
  """
  def used?(%__MODULE__{used_at: used_at}) do
    not is_nil(used_at)
  end

  @doc """
  Marks the token as used with the current timestamp.
  """
  def mark_used_changeset(token) do
    change(token, used_at: DateTime.utc_now() |> DateTime.truncate(:second))
  end

  @doc """
  Increments the attempt counter for the token.
  """
  def increment_attempts_changeset(token) do
    change(token, attempts: token.attempts + 1)
  end
end

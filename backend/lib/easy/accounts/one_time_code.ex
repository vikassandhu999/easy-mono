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
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "one_time_codes" do
    field :code, :string
    field :type, :string
    field :expires_at, :utc_datetime

    belongs_to :user, Easy.Accounts.User

    timestamps()
  end

  @doc false
  def changeset(token, attrs) do
    token
    |> cast(attrs, [
      :code,
      :type,
      :expires_at,
      :user_id
    ])
    |> validate_required([:code, :type, :expires_at, :user_id])
    |> validate_inclusion(:type, ["email_verification", "login"])
    |> hash_code()
    |> unique_constraint(:code)
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

  @doc false
  def verify_code?(%__MODULE__{code: hashed_code}, code) when is_binary(code) do
    Bcrypt.verify_pass(code, hashed_code)
  end

  @doc false
  def expired?(%__MODULE__{expires_at: expires_at}) do
    DateTime.compare(DateTime.utc_now(), expires_at) != :lt
  end
end

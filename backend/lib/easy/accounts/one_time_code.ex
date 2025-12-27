defmodule Easy.Accounts.OneTimeToken do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "one_time_codes" do
    field :code, :string
    field :type, :string
    field :expires_at, :utc_datetime
    field :token, :binary_id
    field :metadata, :map, default: %{}
    field :attempts, :integer, default: 0
    field :used_at, :utc_datetime

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
      :user_id,
      :token,
      :metadata,
      :attempts,
      :used_at
    ])
    |> validate_required([:code, :type, :expires_at])
    |> validate_inclusion(:type, [
      "email_verification",
      "login",
      "client_invitation",
      "client_login",
      "public_join"
    ])
    |> hash_code()
    |> unique_constraint(:code)
    |> foreign_key_constraint(:user_id)
  end

  def increment_attempts_changeset(token) do
    current_attempts = token.attempts || 0

    token
    |> change()
    |> put_change(:attempts, current_attempts + 1)
  end

  def mark_used_changeset(token) do
    token
    |> change()
    |> put_change(:used_at, DateTime.utc_now() |> DateTime.truncate(:second))
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

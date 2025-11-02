defmodule Easy.Whoami.User do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "users" do
    field :email, :string
    field :email_confirmed_at, :utc_datetime_usec
    field :phone, :string
    field :phone_confirmed_at, :utc_datetime_usec
    field :encrypted_password, :string
    field :raw_app_meta_data, :map, default: %{}
    field :raw_user_meta_data, :map, default: %{}
    field :banned_until, :utc_datetime_usec
    field :deleted_at, :utc_datetime_usec

    has_many :sessions, Easy.Whoami.Session
    has_many :tokens, Easy.Whoami.OneTimeToken

    timestamps(type: :utc_datetime_usec)
  end

  # RFC 5322 compliant email regex (simplified but comprehensive)
  @email_regex ~r/^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

  @doc false
  def changeset(user, attrs) do
    user
    |> cast(attrs, [
      :email,
      :email_confirmed_at,
      :phone,
      :phone_confirmed_at,
      :encrypted_password,
      :raw_app_meta_data,
      :raw_user_meta_data,
      :banned_until,
      :deleted_at
    ])
    |> validate_email()
    |> validate_phone()
    |> unique_constraint(:email, name: :idx_users_email_unique)
    |> unique_constraint(:phone, name: :idx_users_phone_unique)
  end

  @doc false
  def registration_changeset(user, attrs) do
    user
    |> cast(attrs, [:email, :phone, :raw_user_meta_data])
    |> validate_required([:email])
    |> validate_email()
    |> validate_phone()
    |> put_password(attrs)
    |> unique_constraint(:email, name: :idx_users_email_unique)
    |> unique_constraint(:phone, name: :idx_users_phone_unique)
  end

  defp validate_email(changeset) do
    changeset
    |> validate_format(:email, @email_regex, message: "must be a valid email address")
    |> validate_length(:email, max: 160)
    |> update_change(:email, &String.downcase/1)
  end

  defp put_password(changeset, %{password: password}) when is_binary(password) do
    changeset
    |> put_change(:encrypted_password, Bcrypt.hash_pwd_salt(password))
  end

  defp put_password(changeset, _attrs), do: changeset

  defp validate_phone(changeset) do
    case get_change(changeset, :phone) do
      nil ->
        changeset

      phone when is_binary(phone) ->
        # Basic validation - can be enhanced with ExPhoneNumber library
        if String.match?(phone, ~r/^\+?[1-9]\d{1,14}$/) do
          changeset
        else
          add_error(changeset, :phone, "invalid phone number format")
        end

      _ ->
        changeset
    end
  end

  @doc """
  Returns true if the email is confirmed.
  """
  def email_confirmed?(%__MODULE__{email_confirmed_at: nil}), do: false
  def email_confirmed?(%__MODULE__{email_confirmed_at: _}), do: true

  @doc """
  Returns true if the phone is confirmed.
  """
  def phone_confirmed?(%__MODULE__{phone_confirmed_at: nil}), do: false
  def phone_confirmed?(%__MODULE__{phone_confirmed_at: _}), do: true

  @doc """
  Returns true if user has a phone number.
  """
  def has_phone?(%__MODULE__{phone: nil}), do: false
  def has_phone?(%__MODULE__{phone: ""}), do: false
  def has_phone?(%__MODULE__{phone: _}), do: true

  @doc """
  Returns true if user has a password set.
  """
  def has_password?(%__MODULE__{encrypted_password: nil}), do: false
  def has_password?(%__MODULE__{encrypted_password: ""}), do: false
  def has_password?(%__MODULE__{encrypted_password: _}), do: true

  @doc """
  Verifies the password against the encrypted password.
  """
  def valid_password?(%__MODULE__{encrypted_password: encrypted}, password)
      when is_binary(encrypted) and is_binary(password) do
    Bcrypt.verify_pass(password, encrypted)
  end

  def valid_password?(_, _), do: false
end

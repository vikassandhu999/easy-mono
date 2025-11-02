defmodule Easy.Whoami.OneTimeToken do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "otts" do
    field :user_id, :binary_id
    field :token_type, :integer
    field :secret, :string
    field :relates_to_email, :string
    field :relates_to_phone, :string

    belongs_to :user, Easy.Whoami.User, define_field: false

    timestamps(type: :utc_datetime_usec)
  end

  @token_types %{
    confirmation: 1,
    login: 2,
    password_change: 3,
    password_change_new: 4,
    client_login: 5,
    phone_verification: 6,
    phone_login: 7
  }

  def token_types, do: @token_types

  def token_type_name(type_int) when is_integer(type_int) do
    Enum.find_value(@token_types, fn {name, value} ->
      if value == type_int, do: name
    end)
  end

  @doc false
  def changeset(token, attrs) do
    token
    |> cast(attrs, [
      :user_id,
      :token_type,
      :secret,
      :relates_to_email,
      :relates_to_phone
    ])
    |> validate_required([:user_id, :token_type, :secret])
    |> validate_inclusion(:token_type, Map.values(@token_types))
    |> unique_constraint([:id, :token_type], name: :idx_otts_id_token_type)
    |> foreign_key_constraint(:user_id)
  end

  @doc """
  Creates a new token with generated secret.
  """
  def new_token(attrs, is_phone_token \\ false) do
    secret =
      if is_phone_token do
        generate_phone_otp()
      else
        generate_token_secret()
      end

    Map.put(attrs, :secret, secret)
  end

  @doc """
  Generates a secure random token secret (base64 encoded).
  """
  def generate_token_secret do
    :crypto.strong_rand_bytes(32)
    |> Base.url_encode64(padding: false)
  end

  @doc """
  Generates a 6-digit OTP for phone verification.
  """
  def generate_phone_otp do
    :rand.uniform(900_000)
    |> Kernel.+(100_000)
    |> Integer.to_string()
  end

  @doc """
  Returns true if this is a phone-based token.
  """
  def phone_token?(%__MODULE__{relates_to_phone: nil}), do: false
  def phone_token?(%__MODULE__{relates_to_phone: ""}), do: false
  def phone_token?(%__MODULE__{relates_to_phone: _}), do: true

  @doc """
  Returns true if this is an email-based token.
  """
  def email_token?(%__MODULE__{relates_to_email: nil}), do: false
  def email_token?(%__MODULE__{relates_to_email: ""}), do: false
  def email_token?(%__MODULE__{relates_to_email: _}), do: true
end

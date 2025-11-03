defmodule Easy.Identity.OneTimeToken do
  use Ecto.Schema

  import Ecto.Changeset

  alias Ecto.UUID

  @primary_key {:id, UUID, autogenerate: true}
  @foreign_key_type UUID

  @token_types %{
    signup_verification: 1,
    password_reset: 2
  }

  def token_types, do: @token_types

  schema "otts" do
    field :token_type, :integer
    field :secret, :string
    # field :expires_at, :utc_datetime
    field :relates_to_email, :string
    field :relates_to_phone, :string

    belongs_to :user, Easy.Identity.User, foreign_key: :user_id

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(ott, attrs) do
    ott
    |> cast(attrs, [
      :token_type,
      :secret,
      # :expires_at,
      :relates_to_email,
      :relates_to_phone,
      :user_id
    ])
    |> validate_required([
      :token_type,
      :secret
      # :expires_at
    ])
    |> foreign_key_constraint(:user_id)
  end
end

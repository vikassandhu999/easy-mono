alias Ecto.UUID

defmodule Easy.Identity.User do
  use Ecto.Schema

  import Ecto.Changeset

  @primary_key {:id, UUID, autogenerate: true}
  @foreign_key_type UUID

  schema "users" do
    field :email, :string
    field :email_confirmed_at, :utc_datetime, default: nil
    field :phone, :string
    field :phone_confirmed_at, :utc_datetime, default: nil
    field :encrypted_password, :string, default: nil, redact: true
    field :raw_user_meta_data, :map, default: %{}

    timestamps(type: :utc_datetime_usec)
  end

  @doc false
  def changeset(user, attrs) do
    user
    |> cast(attrs, [
      :email,
      :phone,
      :email_confirmed_at,
      :phone_confirmed_at,
      :encrypted_password,
      :raw_user_meta_data
    ])
    |> validate_required([:email])
    |> unique_constraint(:email)
  end
end
